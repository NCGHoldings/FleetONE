# Guardian Rules for NCG FleetONE

> **Last updated:** 2026-04-19  
> **Purpose:** Mandatory guardrails for ALL agents working on this codebase.

---

## 1. Database Connection & Context

**CRITICAL RULE: NEVER hardcode or guess the Supabase Project ID.**
You must ALWAYS read the true, environment-specific `VITE_SUPABASE_PROJECT_ID` from the `.env` or `.env.local` file located in the root directory before running any MCP Supabase server queries.

This prevents running SQL analysis or migrations against the wrong database (e.g. `Garage-One` instead of `FleetONE`). 

If the MCP tool returns a permissions error, you must inform the user and construct the SQL script for them to run strictly in their own Supabase SQL Editor dashboard. Do not blindly switch to a different Project ID just because it works.

---

## 2. Multi-Company & GL Safety

- **Always use `getEffectiveCompanyId()`** for COA/GL/journal queries — NEVER use `selectedCompanyId` directly for accounting data. Sub-companies share their parent's GL.
- **Always use `getBusinessUnitCode()`** when tagging journal entries with a business unit identifier.
- **NCG Express is fully standalone** — it has its own COA, GL, and financial periods. Never consolidate it with NCG Holding.
- **Test mode isolation:** Always check `isTestCompany` before writing to production GL tables. Test companies must never leak journal entries into live data.

---

## 3. Company IDs — DO NOT HARDCODE OLD VALUES

| Constant | Current Value | Source |
|----------|---------------|--------|
| `NCG_HOLDING_ID` | `a0000000-0000-0000-0000-000000000001` | `CompanyContext.tsx` |
| `NCG_EXPRESS_ID` | `7ece7595-8b7b-46de-8bfc-c1e8e0da7513` | `CompanyContext.tsx` |
| `NCG_TEST_ID` | `f40b0a9d-ae5b-41b3-9188-535ae94c9020` | `CompanyContext.tsx` |

> **WARNING:** `f40b0a9d-...` was previously documented as the Holding ID. It is now the **Test** ID. Always import from `CompanyContext.tsx`, never hardcode.

---

## 4. Customer Creation Rules

- **Always use `useCustomerBridge.syncToAccounting()`** when creating customers from any module (Yutong, Sinotruk, Light Vehicle, Special Hire, School Bus).
- **Never insert directly** into the `customers` table from module-specific code — the bridge handles duplicate detection, phone normalization, auto-categorization, and source linking.
- Customer codes follow the pattern: `CUS-{MODULE}-XXXXX` (e.g. `CUS-YUT-00001`).

---

## 5. Document Numbering

- **Always use `useGenerateNumber(entityType)`** from `useNumbering.ts` for generating sequential document numbers.
- The RPC `generate_entity_number` handles atomic increment and company-scoped sequences.
- Never generate numbers client-side with `Date.now()` or random IDs for user-facing documents.

---

## 6. Naming Conventions

### Sinotruk Inconsistency (KNOWN — do NOT "fix" without explicit approval)
- **DB tables:** Always `sinotruck_*` (with a `ck`)
- **Component files:** Mix of `Sinotruk` and `Sinotruck`
- **Hook files:** Both `useSinotruk*.ts` and `useSinotruck*.ts` exist
- Do NOT rename files to "fix" this — it will break imports across 125+ files.

### File Patterns
- Pages: `src/pages/{PageName}.tsx`
- Components: `src/components/{module}/{ComponentName}.tsx`
- Hooks: `src/hooks/use{FeatureName}.ts`
- Lib utilities: `src/lib/{feature-name}.ts`

---

## 7. Environment & Deployment

- **`.env` is gitignored** — NEVER commit it to any repository.
- **Lovable platform** connects to Supabase via its native integration (not via `.env` files in the repo).
- **To sync to Lovable:** Run `npm run lovable-sync` (NOT a manual `git push` to the Lovable repo — that will 408 timeout due to 384MB history bloat).
- **Normal pushes** to `NCGHoldings/FleetONE` work fine via `git push origin main`.

---

## 8. Dev Commands

```bash
npm run dev              # Start local Vite dev server
npm run build            # Production build
npm run lint             # ESLint check
npm run lovable-sync     # 1-click sync to both NCGHoldings + Lovable repos
```

---

## 9. SQL Migrations

- All migrations go in `supabase/migrations/` with timestamp-prefixed filenames.
- Use `DO $$ BEGIN ... EXCEPTION WHEN ... END $$;` blocks for safe, idempotent migrations.
- Always use `IF NOT EXISTS` for table/column creation.
- RLS policies must be applied to every new table — reference the hardening migrations in `20260415000000_*.sql`.

---

## 10. Context File Maintenance

- **`context.md`** must be updated whenever new modules, company IDs, key constants, or architectural patterns change.
- **`rules.md`** (this file) must be updated whenever new guardrails are discovered during debugging.
- Both files live in `.agent/` and are auto-read by AI agents before any work.
