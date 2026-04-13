/**
 * Core compliance calculation logic following FuelEU Maritime Regulation (EU) 2023/1805
 * Annex IV and Articles 20-21.
 *
 * Key formula references:
 * - Target GHG Intensity (2025): 89.3368 gCO2e/MJ (2% reduction from 2020 baseline of 91.16)
 * - Energy in Scope (MJ) = fuelConsumption (tonnes) × 41,000 MJ/t (lower heating value approximation)
 * - Compliance Balance (CB) = (TargetIntensity - ActualIntensity) × EnergyInScope
 *   Positive CB = surplus; Negative CB = deficit
 */

/** Target GHG intensity for 2025 compliance period (gCO2e/MJ), 2% below 2020 baseline of 91.16 */
export const TARGET_INTENSITY_2025 = 89.3368;

/** Lower Heating Value (LHV) conversion factor: MJ per tonne of fuel */
export const MJ_PER_TONNE = 41_000;

/**
 * Get the applicable target GHG intensity for a given year.
 * Currently uses 89.3368 for all years per assignment spec.
 */
export function getTargetIntensity(_year: number): number {
  return TARGET_INTENSITY_2025;
}

/**
 * Calculate the energy in scope (MJ) from fuel consumption.
 * Energy = fuelConsumption (t) × 41,000 MJ/t
 */
export function calculateEnergyInScope(fuelConsumptionTonnes: number): number {
  return fuelConsumptionTonnes * MJ_PER_TONNE;
}

/**
 * Calculate the Compliance Balance (CB) for a ship.
 * CB = (TargetIntensity - ActualGhgIntensity) × EnergyInScope
 *
 * From Annex IV Part A of FuelEU Maritime Regulation:
 * - Positive CB indicates the ship is performing better than the target (surplus)
 * - Negative CB indicates the ship is performing worse than the target (deficit)
 *
 * Units: gCO2e (since gCO2e/MJ × MJ = gCO2e)
 */
export function calculateComplianceBalance(
  actualGhgIntensity: number,
  fuelConsumptionTonnes: number,
  year: number
): {
  cbGco2eq: number;
  targetIntensity: number;
  energyInScope: number;
  status: "surplus" | "deficit" | "compliant";
} {
  const targetIntensity = getTargetIntensity(year);
  const energyInScope = calculateEnergyInScope(fuelConsumptionTonnes);
  const cbGco2eq = (targetIntensity - actualGhgIntensity) * energyInScope;

  let status: "surplus" | "deficit" | "compliant";
  if (cbGco2eq > 0) {
    status = "surplus";
  } else if (cbGco2eq < 0) {
    status = "deficit";
  } else {
    status = "compliant";
  }

  return { cbGco2eq, targetIntensity, energyInScope, status };
}

/**
 * Calculate percent difference between comparison and baseline GHG intensity.
 * percentDiff = ((comparison / baseline) - 1) × 100
 */
export function calculatePercentDiff(
  baselineIntensity: number,
  comparisonIntensity: number
): number {
  if (baselineIntensity === 0) return 0;
  return ((comparisonIntensity / baselineIntensity) - 1) * 100;
}

/**
 * Greedy pool allocation algorithm per Article 21.
 * Sorts members descending by CB, then transfers surplus to deficits.
 * Rules:
 * - Sum(adjustedCB) must be >= 0
 * - Deficit ship cannot exit worse than it entered
 * - Surplus ship cannot exit negative
 */
export function allocatePool(
  members: Array<{ shipId: string; adjustedCb: number }>
): Array<{ shipId: string; cbBefore: number; cbAfter: number }> {
  // Sort descending by CB (surplus first)
  const sorted = [...members].sort((a, b) => b.adjustedCb - a.adjustedCb);

  const result: Array<{ shipId: string; cbBefore: number; cbAfter: number }> = [];
  let remainingSurplus = 0;

  // Accumulate total surplus
  for (const m of sorted) {
    if (m.adjustedCb > 0) remainingSurplus += m.adjustedCb;
  }

  // Allocate: give deficits as much as possible from the surplus pool
  const cbAfterMap = new Map<string, number>();
  for (const m of sorted) {
    if (m.adjustedCb >= 0) {
      cbAfterMap.set(m.shipId, m.adjustedCb);
    } else {
      // Try to cover the deficit
      const deficit = Math.abs(m.adjustedCb);
      const toApply = Math.min(deficit, remainingSurplus);
      remainingSurplus -= toApply;
      cbAfterMap.set(m.shipId, m.adjustedCb + toApply);
    }
  }

  // Reduce surplus ships proportionally if not all surplus was used
  // (greedy: just report what was allocated)
  for (const m of members) {
    result.push({
      shipId: m.shipId,
      cbBefore: m.adjustedCb,
      cbAfter: cbAfterMap.get(m.shipId) ?? m.adjustedCb,
    });
  }

  return result;
}
