import { Router, type IRouter } from "express";
import { eq, and, sum } from "drizzle-orm";
import { db, routesTable, bankEntriesTable } from "@workspace/db";
import {
  GetComplianceBalanceQueryParams,
  GetComplianceBalanceResponse,
  GetAdjustedComplianceBalanceQueryParams,
  GetAdjustedComplianceBalanceResponse,
  GetComplianceSummaryQueryParams,
  GetComplianceSummaryResponse,
} from "@workspace/api-zod";
import { calculateComplianceBalance, getTargetIntensity } from "../lib/compliance";

const router: IRouter = Router();

router.get("/compliance/cb", async (req, res): Promise<void> => {
  const parsed = GetComplianceBalanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shipId, year } = parsed.data;

  // Find routes for this ship (shipId is the routeId in our seed)
  const routes = await db
    .select()
    .from(routesTable)
    .where(and(eq(routesTable.shipId, shipId), eq(routesTable.year, year)));

  if (!routes.length) {
    res.status(400).json({ error: `No routes found for shipId=${shipId} year=${year}` });
    return;
  }

  // Use first matching route (aggregate if needed)
  const route = routes[0]!;
  const cbResult = calculateComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);

  res.json(GetComplianceBalanceResponse.parse({
    shipId,
    year,
    cbGco2eq: cbResult.cbGco2eq,
    targetIntensity: cbResult.targetIntensity,
    actualIntensity: route.ghgIntensity,
    energyInScope: cbResult.energyInScope,
    status: cbResult.status,
  }));
});

router.get("/compliance/adjusted-cb", async (req, res): Promise<void> => {
  const parsed = GetAdjustedComplianceBalanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shipId, year } = parsed.data;

  const routes = await db
    .select()
    .from(routesTable)
    .where(and(eq(routesTable.shipId, shipId), eq(routesTable.year, year)));

  if (!routes.length) {
    res.status(400).json({ error: `No routes found for shipId=${shipId} year=${year}` });
    return;
  }

  const route = routes[0]!;
  const cbResult = calculateComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);

  // Aggregate bank entries
  const bankEntries = await db
    .select()
    .from(bankEntriesTable)
    .where(and(eq(bankEntriesTable.shipId, shipId), eq(bankEntriesTable.year, year)));

  let bankedAmount = 0;
  let appliedAmount = 0;

  for (const entry of bankEntries) {
    if (entry.entryType === "banked") bankedAmount += entry.amountGco2eq;
    if (entry.entryType === "applied") appliedAmount += entry.amountGco2eq;
  }

  const adjustedCbGco2eq = cbResult.cbGco2eq + appliedAmount - bankedAmount;

  let status: "surplus" | "deficit" | "compliant";
  if (adjustedCbGco2eq > 0) status = "surplus";
  else if (adjustedCbGco2eq < 0) status = "deficit";
  else status = "compliant";

  res.json(GetAdjustedComplianceBalanceResponse.parse({
    shipId,
    year,
    cbGco2eq: cbResult.cbGco2eq,
    bankedAmount,
    appliedAmount,
    adjustedCbGco2eq,
    status,
  }));
});

router.get("/compliance/summary", async (req, res): Promise<void> => {
  const parsed = GetComplianceSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { year } = parsed.data;
  const targetIntensity = getTargetIntensity(year);

  const routes = await db
    .select()
    .from(routesTable)
    .where(eq(routesTable.year, year));

  if (!routes.length) {
    res.json(GetComplianceSummaryResponse.parse({
      year,
      totalShips: 0,
      surplusShips: 0,
      deficitShips: 0,
      totalBanked: 0,
      averageGhgIntensity: 0,
      targetIntensity,
    }));
    return;
  }

  let surplusShips = 0;
  let deficitShips = 0;
  let totalGhg = 0;

  for (const route of routes) {
    totalGhg += route.ghgIntensity;
    const cb = calculateComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);
    if (cb.cbGco2eq > 0) surplusShips++;
    else if (cb.cbGco2eq < 0) deficitShips++;
  }

  const bankEntries = await db
    .select()
    .from(bankEntriesTable)
    .where(eq(bankEntriesTable.year, year));

  let totalBanked = 0;
  for (const entry of bankEntries) {
    if (entry.entryType === "banked") totalBanked += entry.amountGco2eq;
    if (entry.entryType === "applied") totalBanked -= entry.amountGco2eq;
  }

  res.json(GetComplianceSummaryResponse.parse({
    year,
    totalShips: routes.length,
    surplusShips,
    deficitShips,
    totalBanked: Math.max(0, totalBanked),
    averageGhgIntensity: totalGhg / routes.length,
    targetIntensity,
  }));
});

export default router;
