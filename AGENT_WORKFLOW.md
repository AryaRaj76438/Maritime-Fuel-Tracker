# AI Agent Workflow Log

## Agents Used

- **Replit Agent (main)** — Orchestration, architecture planning, OpenAPI spec design, backend implementation (compliance formulas, routes, DB schema, seeding)
- **Replit DESIGN subagent** — Full frontend implementation: React pages (Dashboard, Routes, Compare, Banking, Pooling), layout component, CSS theme, chart integration

## Prompts & Outputs

### Example 1: Database Schema from Spec

**Prompt context provided to agent:**
> The assignment specifies these tables: routes (id, route_id, year, ghg_intensity, is_baseline), ship_compliance (id, ship_id, year, cb_gco2eq), bank_entries (id, ship_id, year, amount_gco2eq), pools (id, year, created_at), pool_members (pool_id, ship_id, cb_before, cb_after)

**Output generated:**
```typescript
// lib/db/src/schema/routes.ts
export const routesTable = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  // ... all columns with proper Drizzle types
});
```

The agent correctly mapped the spec table definitions to Drizzle ORM column types, added missing columns needed by the API (energyInScope, shipId), and set up insert schemas with `drizzle-zod`.

### Example 2: Compliance Formula Implementation

**Prompt:**
> Implement the Compliance Balance formula from FuelEU Maritime Regulation Annex IV:
> CB = (TargetIntensity - ActualIntensity) × EnergyInScope
> where EnergyInScope = fuelConsumption × 41,000 MJ/t
> Target for 2025: 89.3368 gCO₂e/MJ

**Output (artifacts/api-server/src/lib/compliance.ts):**
```typescript
export const TARGET_INTENSITY_2025 = 89.3368;
export const MJ_PER_TONNE = 41_000;

export function calculateComplianceBalance(
  actualGhgIntensity: number,
  fuelConsumptionTonnes: number,
  year: number
) {
  const targetIntensity = getTargetIntensity(year);
  const energyInScope = fuelConsumptionTonnes * MJ_PER_TONNE;
  const cbGco2eq = (targetIntensity - actualGhgIntensity) * energyInScope;
  // ...
}
```

### Example 3: DESIGN subagent for Frontend

**Prompt excerpt sent to DESIGN subagent:**
> Build a professional FuelEU Maritime Compliance Dashboard... feels like a precision instrument — dense, data-rich, authoritative... deep navy, steel blue, teal accents... [full page list, data types, API hooks]

**Output:**
- Complete `src/index.css` with maritime deep-navy theme (HSL values)
- `src/components/layout.tsx` — responsive sidebar with navigation
- 5 page components (dashboard, routes, compare, banking, pooling)
- Recharts integration for bar charts on Compare page and Dashboard

## Validation / Corrections

1. **Formula verification:** Cross-referenced the CB formula with the PDF document (ESSF-SAPS-WS1-FuelEU calculation methodologies). Confirmed the 89.3368 target as 2% below 91.16 baseline. Confirmed MJ/t conversion factor of 41,000.

2. **API schema corrections:** The initial spec used `nullable` incorrectly for OpenAPI 3.1. Fixed to use `type: ["number", "null"]` syntax per OpenAPI 3.1 spec.

3. **Banking validation:** Added proper validation for the "apply banked" endpoint — it checks that the requested amount does not exceed available net banked surplus (banked - already applied).

4. **Pooling allocation:** Verified the greedy allocation algorithm correctly handles the case where surplus is insufficient to fully cover all deficits, and that it enforces both constraints:
   - Deficit ship cannot exit worse
   - Surplus ship cannot exit negative

5. **Route filtering:** The dynamic Drizzle query for filtering routes needed `.$dynamic()` to build conditionally. Applied correctly.

## Observations

### Where the agent saved time
- **OpenAPI-first workflow** — Writing the full spec first and running codegen generated all TypeScript types, Zod validators, and React Query hooks in seconds. Prevented type drift between frontend and backend.
- **DESIGN subagent parallelism** — Frontend and backend were built simultaneously. Total time was determined by the slower of the two (frontend design), not their sum.
- **Drizzle schema generation** — `createInsertSchema` from `drizzle-zod` automatically derived Zod schemas from table definitions, eliminating manual type duplication.

### Where manual review was needed
- **Compliance formula correctness** — The exact constants (89.3368, 41,000 MJ/t) required careful reading of the PDF reference document. The agent would not have known these without the document.
- **OpenAPI nullable syntax** — OpenAPI 3.1 uses `type: ["string", "null"]` but the agent's first instinct was the OpenAPI 3.0 `nullable: true` syntax. Required correction.
- **Banking state management** — The banking apply/bank logic needed careful logic to track net available banked surplus correctly across multiple transactions per ship/year.

### How tools were combined effectively
1. Main agent wrote the OpenAPI spec (contract) and ran codegen
2. Main agent launched DESIGN subagent (async) immediately after codegen
3. Main agent built backend routes + DB schema in parallel
4. DESIGN subagent built entire frontend independently, using generated hook signatures
5. No integration issues — the shared OpenAPI contract kept both sides aligned

## Best Practices Followed

- **Contract-first design:** OpenAPI spec written before any backend code or frontend hooks
- **Separation of concerns:** Pure business logic (`lib/compliance.ts`) has zero framework dependencies — testable in isolation
- **Structured logging:** Pino used throughout backend, never `console.log`
- **Input/output validation:** All routes validate with Zod schemas generated from OpenAPI
- **Parallel development:** Frontend and backend built simultaneously after spec + codegen
- **Seed data:** 5 routes seeded immediately so the app is not empty on first load
- **TypeScript strict mode:** All packages extend `tsconfig.base.json` with strict settings
