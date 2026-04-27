---
description: Nightly Maintenance Workflow for Jules (Refactoring, UI Testing, DB Optimization) — FleetONE
---

# Nightly Maintenance Protocol — FleetONE

This enterprise-grade workflow is executed every night at midnight Sri Lanka Time (18:30 UTC) by the AI agent (Jules). Jules operates as the Automated Stabilization Bridge between rapid daytime development and morning QA/Staging.

**Jules's Primary Objective**: Optimize, refactor, and type-check the daytime `main` branch, then securely promote the stabilized build to `staging`.

**FleetONE Context**: Fleet management system for NCG Holdings. Supabase Project: `wwjpdszkmtnzshbulkon`. Sister system to GarageOne — always check GarageOne for established patterns before creating new ones.

## 0. Context Initialization & System Memory (Continuous State)
- Immediately read `SYSTEM_MEMORY.local.md` to understand the current architecture, what the developers worked on yesterday, and what bugs were recently fixed.
- Jules must never act blindly; always continue from where the previous day's context left off.
- Cross-reference with GarageOne's architecture at `/Users/staff/Documents/Garage-One/` for established patterns.

## 1. System Health & Dependency Hygiene
- Run `npm audit` to check for dependency vulnerabilities. Boldly run `npm audit fix` for safe, non-breaking minor/patch updates. Do not touch Major version bumps unless explicitly instructed.
- **Note**: As of bootstrap (2026-04-27), 21 vulnerabilities exist (9 moderate, 11 high, 1 critical). Document resolution status in `SYSTEM_MEMORY.local.md`.
- Use the Supabase MCP to run the `get_advisors` tool against project `wwjpdszkmtnzshbulkon`. Check for both `security` and `performance` advisories. Document any high-severity items in `docs/security/`.

## 2. Codebase Refactoring & Cleanup (The Daytime Scrubber)
// turbo-all
- **Memoization**: Scan the `src/` directory for bloated React components doing expensive UI mapping/filtering on every render. Wrap these expensive calculations in `useMemo` blocks.
- **Type Safety**: Scan for newly added `any` types that slip past strict checking. Replace them with strict interfaces or generics where the schema is known. Enforce usage of types from `src/integrations/supabase/types.ts`.
- **Console Log Purge**: Run a search for stray `console.log` statements in the `src/` directory and remove them. Do not remove targeted error logging (`console.error` or `console.warn`).
- **DRY Validation**: Identify newly introduced duplicate UI patterns across the codebase and refactor them into a single reusable component located in `src/components/ui`. Re-route the usage to the design system.
- **Bundle Guard**: Monitor `dist/assets/index-*.js` size. If it exceeds 12 MB, identify the largest contributor using `npx vite-bundle-visualizer` and propose code-splitting via dynamic imports.

## 3. Database Optimization & Data Consistency
// turbo-all
- Verify all Row-Level Security (RLS) policies using the Supabase MCP `execute_sql` tool against project `wwjpdszkmtnzshbulkon`. Ensure `auth.uid()` or `auth.jwt()` calls inside policies are wrapped in sub-selects `(select auth.uid())` for `InitPlan` performance optimization.
- Query PostgreSQL to identify missing or duplicate indexes. Drop duplicate indexes and create missing ones.
- Ensure all new database write operations in `src/services/` or `src/hooks/` are idempotent. If any "post transaction" or "create record" functions lack a check for a `transaction_id` or `idempotency_key`, document and plan remediation.
- **GL Engine**: Do NOT modify `src/lib/gl-posting-utils.ts` without explicit engineering approval. This is core financial infrastructure.

## 4. State & Integrity Verification (The Green Gate)
- Run `npx tsc --noEmit` to verify strict TypeScript integrity across the entire project.
- Run `npx eslint .` and `npm run build:dev` to verify the codebase bundling process is not broken by the daytime rapid dev.
- *CRITICAL:* If there are existing errors, switch modes to execution and fix the type/build errors immediately before proceeding. Jules cannot push a broken build to Staging.
- Build command: `NODE_OPTIONS="--max-old-space-size=6144" npm run build`

## 5. Branch Promotion, Documentation, & System Memory Update
- Create or update the **"Jules Nightly Overrides & Logs"** section inside `SYSTEM_MEMORY.local.md`. Document exactly what refactoring was done, which `any` types were fixed, and what RLS policies were optimized tonight.
- For any major architectural abstract components created (e.g., a new shared UI hook), write a proper documentation markdown file inside the `docs/architecture/` or `docs/components/` folder.
- Generate a `walkthrough.md` summarizing the nightly operation.
- Check out or switch to the `staging` branch: `git branch -f staging HEAD` (to overwrite staging with the polished main commit).
- Push the optimized code directly to remote staging: `git push origin staging --force`.
- This ensures the QA team and the daytime developers wake up to a fully isolated, heavily optimized, and well-documented build.

---
*This protocol is a direct port from GarageOne's nightly_maintenance.md. Sync any improvements back to GarageOne as well.*
