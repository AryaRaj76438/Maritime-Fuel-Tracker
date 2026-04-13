import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, routesTable } from "@workspace/db";
import {
  GetRoutesQueryParams,
  GetRoutesResponse,
  SetBaselineParams,
  SetBaselineResponse,
  GetRoutesComparisonResponse,
} from "@workspace/api-zod";
import { calculateComplianceBalance, calculatePercentDiff, getTargetIntensity } from "../lib/compliance";

const router: IRouter = Router();

router.get("/routes", async (req, res): Promise<void> => {
  const parsed = GetRoutesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vesselType, fuelType, year } = parsed.data;

  let query = db.select().from(routesTable).$dynamic();

  if (vesselType) {
    query = query.where(eq(routesTable.vesselType, vesselType)) as typeof query;
  }
  if (fuelType) {
    query = query.where(eq(routesTable.fuelType, fuelType)) as typeof query;
  }
  if (year) {
    query = query.where(eq(routesTable.year, year)) as typeof query;
  }

  const routes = await query;

  const enriched = routes.map((r) => {
    const cb = calculateComplianceBalance(r.ghgIntensity, r.fuelConsumption, r.year);
    return {
      ...r,
      energyInScope: cb.energyInScope,
      complianceBalance: cb.cbGco2eq,
    };
  });

  res.json(GetRoutesResponse.parse(enriched));
});

router.get("/routes/comparison", async (req, res): Promise<void> => {
  const allRoutes = await db.select().from(routesTable);
  const baseline = allRoutes.find((r) => r.isBaseline);
  const targetIntensity = getTargetIntensity(2025);

  if (!baseline) {
    const comparisons = allRoutes.map((r) => ({
      routeId: r.routeId,
      vesselType: r.vesselType,
      fuelType: r.fuelType,
      year: r.year,
      ghgIntensity: r.ghgIntensity,
      isBaseline: false,
      percentDiff: null,
      compliant: r.ghgIntensity <= targetIntensity,
      targetIntensity,
    }));

    res.json(GetRoutesComparisonResponse.parse({
      baseline: null,
      comparisons,
      targetIntensity,
    }));
    return;
  }

  const comparisons = allRoutes.map((r) => ({
    routeId: r.routeId,
    vesselType: r.vesselType,
    fuelType: r.fuelType,
    year: r.year,
    ghgIntensity: r.ghgIntensity,
    isBaseline: r.isBaseline,
    percentDiff: r.isBaseline
      ? null
      : calculatePercentDiff(baseline.ghgIntensity, r.ghgIntensity),
    compliant: r.ghgIntensity <= targetIntensity,
    targetIntensity,
  }));

  const baselineItem = {
    routeId: baseline.routeId,
    vesselType: baseline.vesselType,
    fuelType: baseline.fuelType,
    year: baseline.year,
    ghgIntensity: baseline.ghgIntensity,
    isBaseline: true,
    percentDiff: null,
    compliant: baseline.ghgIntensity <= targetIntensity,
    targetIntensity,
  };

  res.json(GetRoutesComparisonResponse.parse({
    baseline: baselineItem,
    comparisons,
    targetIntensity,
  }));
});

router.post("/routes/:routeId/baseline", async (req, res): Promise<void> => {
  const rawRouteId = Array.isArray(req.params.routeId) ? req.params.routeId[0] : req.params.routeId;
  const params = SetBaselineParams.safeParse({ routeId: rawRouteId });

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Clear all existing baselines
  await db.update(routesTable).set({ isBaseline: false });

  // Set the new baseline
  const [updated] = await db
    .update(routesTable)
    .set({ isBaseline: true })
    .where(eq(routesTable.routeId, params.data.routeId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: `Route ${params.data.routeId} not found` });
    return;
  }

  const cb = calculateComplianceBalance(updated.ghgIntensity, updated.fuelConsumption, updated.year);

  res.json(SetBaselineResponse.parse({
    ...updated,
    energyInScope: cb.energyInScope,
    complianceBalance: cb.cbGco2eq,
  }));
});

export default router;
