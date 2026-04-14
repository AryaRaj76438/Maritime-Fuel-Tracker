# Reflection on AI-Assisted Development

## What I Learned Using AI Agents

The most valuable insight from this project was that AI agents excel at **structural generation** — writing boilerplate, converting contracts to code, and maintaining consistency — but they still require domain expertise to provide correct inputs.

The OpenAPI spec required me to understand the FuelEU regulatory framework first: what endpoints needed to exist, what data flowed through them, and what validation rules applied. Once the spec was correct, the agents handled the mechanical work of code generation flawlessly.

The two-agent pattern (main orchestrator + DESIGN subagent) was particularly effective for full-stack work. The design subagent received the API hook signatures and produced a complete, themed frontend without any back-and-forth. This parallelism is the real efficiency gain — the total time was the max of two parallel streams, not their sum.

## Efficiency Gains vs Manual Coding

| Task | Manual Estimate | With AI Agents |
|---|---|---|
| OpenAPI spec (15 endpoints) | 45 min | 20 min |
| TypeScript types + Zod schemas | 60 min | 0 min (codegen) |
| React Query hooks | 60 min | 0 min (codegen) |
| DB schema (4 tables) | 30 min | 10 min |
| Backend route handlers (5 domains) | 90 min | 25 min |
| Frontend (5 pages + theme + layout) | 180 min | 35 min (subagent) |
| **Total** | **~7.5 hours** | **~1.5 hours** |

The 5x speedup came primarily from:
1. Eliminating type duplication through codegen
2. Parallel frontend/backend development
3. The DESIGN subagent's ability to make independent visual decisions without consultation

## Improvements for Next Time

1. **Provide the reference document earlier** — The PDF formulas should be extracted and summarized before writing the spec, not after. Having the correct constants (89.3368, 41,000 MJ/t) at spec-writing time would prevent any corrections.

2. **Plan pooling state complexity upfront** — The Article 21 pooling rules (deficit ships cannot exit worse, surplus ships cannot exit negative) required careful thought during implementation. A pre-written domain model with the allocation algorithm would have been cleaner to hand off.

3. **Add test scaffolding to the spec request** — Asking the subagent to include unit tests for the compliance calculations alongside the backend code would have produced testable output in the same pass.

4. **Use typed feature flags** — Some UI behaviors (disable banking if CB ≤ 0, disable pool creation if sum < 0) were implemented differently between frontend and backend. A shared constants package would ensure both sides use identical thresholds.
