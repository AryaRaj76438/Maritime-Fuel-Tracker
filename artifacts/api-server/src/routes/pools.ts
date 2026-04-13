import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, poolsTable, poolMembersTable } from "@workspace/db";
import {
  CreatePoolBody,
  CreatePoolResponse,
  GetPoolsQueryParams,
  GetPoolsResponse,
} from "@workspace/api-zod";
import { allocatePool } from "../lib/compliance";

const router: IRouter = Router();

router.post("/pools", async (req, res): Promise<void> => {
  const parsed = CreatePoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { year, members } = parsed.data;

  if (!members || members.length < 2) {
    res.status(400).json({ error: "Pool requires at least 2 members" });
    return;
  }

  // Validate: Sum of adjustedCB must be >= 0
  const poolSum = members.reduce((sum, m) => sum + m.adjustedCb, 0);
  if (poolSum < 0) {
    res.status(400).json({
      error: `Pool sum (${poolSum.toFixed(2)} gCO2e) is negative — the pool cannot cover all deficits`,
    });
    return;
  }

  // Validate: Surplus ship cannot exit negative (will be checked post-allocation)
  // Validate: Deficit ship cannot exit worse
  const allocations = allocatePool(members);

  // Check constraints after allocation
  for (const alloc of allocations) {
    const original = members.find((m) => m.shipId === alloc.shipId)!;
    if (original.adjustedCb > 0 && alloc.cbAfter < 0) {
      res.status(400).json({
        error: `Surplus ship ${alloc.shipId} would exit with negative CB — invalid pool configuration`,
      });
      return;
    }
    if (original.adjustedCb < 0 && alloc.cbAfter < original.adjustedCb) {
      res.status(400).json({
        error: `Deficit ship ${alloc.shipId} would exit worse than it entered — invalid pool configuration`,
      });
      return;
    }
  }

  // Persist the pool
  const [pool] = await db.insert(poolsTable).values({ year }).returning();
  if (!pool) {
    res.status(500).json({ error: "Failed to create pool" });
    return;
  }

  await db.insert(poolMembersTable).values(
    allocations.map((a) => ({
      poolId: pool.id,
      shipId: a.shipId,
      cbBefore: a.cbBefore,
      cbAfter: a.cbAfter,
    }))
  );

  res.json(CreatePoolResponse.parse({
    poolId: pool.id,
    year: pool.year,
    members: allocations,
    poolSum,
    valid: true,
  }));
});

router.get("/pools", async (req, res): Promise<void> => {
  const parsed = GetPoolsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let poolsQuery = db.select().from(poolsTable).$dynamic();
  if (parsed.data.year) {
    poolsQuery = poolsQuery.where(eq(poolsTable.year, parsed.data.year)) as typeof poolsQuery;
  }

  const pools = await poolsQuery;

  const poolsWithMembers = await Promise.all(
    pools.map(async (pool) => {
      const members = await db
        .select()
        .from(poolMembersTable)
        .where(eq(poolMembersTable.poolId, pool.id));
      return {
        id: pool.id,
        year: pool.year,
        createdAt: pool.createdAt.toISOString(),
        members: members.map((m) => ({
          shipId: m.shipId,
          cbBefore: m.cbBefore,
          cbAfter: m.cbAfter,
        })),
      };
    })
  );

  res.json(GetPoolsResponse.parse(poolsWithMembers));
});

export default router;
