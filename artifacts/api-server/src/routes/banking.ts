import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, routesTable, bankEntriesTable } from "@workspace/db";
import {
  GetBankingRecordsQueryParams,
  GetBankingRecordsResponse,
  BankSurplusBody,
  BankSurplusResponse,
  ApplyBankedBody,
  ApplyBankedResponse,
} from "@workspace/api-zod";
import { calculateComplianceBalance } from "../lib/compliance";

const router: IRouter = Router();

router.get("/banking/records", async (req, res): Promise<void> => {
  const parsed = GetBankingRecordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shipId, year } = parsed.data;

  const entries = await db
    .select()
    .from(bankEntriesTable)
    .where(and(eq(bankEntriesTable.shipId, shipId), eq(bankEntriesTable.year, year)));

  res.json(GetBankingRecordsResponse.parse(
    entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))
  ));
});

router.post("/banking/bank", async (req, res): Promise<void> => {
  const parsed = BankSurplusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shipId, year, amount } = parsed.data;

  // Get current CB
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

  if (cbResult.cbGco2eq <= 0) {
    res.status(400).json({ error: "Cannot bank: compliance balance is not positive (no surplus)" });
    return;
  }

  if (amount > cbResult.cbGco2eq) {
    res.status(400).json({ error: `Cannot bank ${amount} gCO2e — only ${cbResult.cbGco2eq.toFixed(2)} available as surplus` });
    return;
  }

  // Calculate already banked/applied
  const existingEntries = await db
    .select()
    .from(bankEntriesTable)
    .where(and(eq(bankEntriesTable.shipId, shipId), eq(bankEntriesTable.year, year)));

  let alreadyBanked = 0;
  let alreadyApplied = 0;
  for (const e of existingEntries) {
    if (e.entryType === "banked") alreadyBanked += e.amountGco2eq;
    if (e.entryType === "applied") alreadyApplied += e.amountGco2eq;
  }
  const availableSurplus = cbResult.cbGco2eq - alreadyBanked + alreadyApplied;

  if (amount > availableSurplus) {
    res.status(400).json({ error: `Cannot bank ${amount} — only ${availableSurplus.toFixed(2)} surplus remaining after prior banking` });
    return;
  }

  await db.insert(bankEntriesTable).values({ shipId, year, amountGco2eq: amount, entryType: "banked" });

  const cbAfter = cbResult.cbGco2eq - alreadyBanked - amount + alreadyApplied;

  res.json(BankSurplusResponse.parse({
    shipId,
    year,
    cbBefore: cbResult.cbGco2eq,
    applied: amount,
    cbAfter,
    availableBanked: alreadyBanked + amount - alreadyApplied,
    action: "banked",
  }));
});

router.post("/banking/apply", async (req, res): Promise<void> => {
  const parsed = ApplyBankedBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { shipId, year, amount } = parsed.data;

  // Get current CB
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

  // Get available banked surplus
  const existingEntries = await db
    .select()
    .from(bankEntriesTable)
    .where(and(eq(bankEntriesTable.shipId, shipId), eq(bankEntriesTable.year, year)));

  let availableBanked = 0;
  let alreadyApplied = 0;
  for (const e of existingEntries) {
    if (e.entryType === "banked") availableBanked += e.amountGco2eq;
    if (e.entryType === "applied") alreadyApplied += e.amountGco2eq;
  }
  const netAvailable = availableBanked - alreadyApplied;

  if (netAvailable <= 0) {
    res.status(400).json({ error: "No banked surplus available to apply" });
    return;
  }

  if (amount > netAvailable) {
    res.status(400).json({ error: `Cannot apply ${amount} — only ${netAvailable.toFixed(2)} banked surplus available` });
    return;
  }

  await db.insert(bankEntriesTable).values({ shipId, year, amountGco2eq: amount, entryType: "applied" });

  const cbAfter = cbResult.cbGco2eq + amount;

  res.json(ApplyBankedResponse.parse({
    shipId,
    year,
    cbBefore: cbResult.cbGco2eq,
    applied: amount,
    cbAfter,
    availableBanked: netAvailable - amount,
    action: "applied",
  }));
});

export default router;
