# CLAUDE.md — FleetONE Enterprise
> **AI Agent Context File** | Read this before making ANY change to this codebase.
> This file is committed to the repository and is the primary context source for Jules, Claude Code, and all AI agents.

---

## ⚡ CRITICAL RULES — READ FIRST

1. **`src/lib/gl-posting-utils.ts` is PROTECTED.** Core financial engine. Do NOT modify without explicit engineer approval.
2. **`src/integrations/supabase/types.ts` is currently empty.** Always regenerate from live DB before using: `npx supabase gen types typescript --project-id wwjpdszkmtnzshbulkon > src/integrations/supabase/types.ts`
3. **Never assume DB schema** — always check live Supabase project `wwjpdszkmtnzshbulkon`.
4. **Never remove `--legacy-peer-deps`** from install commands.
5. **Never commit `.env` or `SYSTEM_MEMORY.local.md`.**
6. **Never run `npm audit fix --force`** — breaking changes risk.
7. **Multi-company GL architecture is intentional and complex** — read the Multi-Company section before touching any financial code.
8. **Never physically delete a posted journal entry** — use reversal (contra entry) only.

---

## 🔴 DEPLOYMENT

| Key | Value |
|-----|-------|
| **Production URL** | `https://fleetone.ncg.lk` |
| **Staging URL** | `https://staging.fleetone.ncg.lk` |
| **Framework** | React 18 + Vite 5 + TypeScript 5 |
| **Node Target** | 20 LTS |
| **Build Command** | `NODE_OPTIONS="--max-old-space-size=6144" npm run build` |
| **Install Command** | `npm install --legacy-peer-deps` |
| **Deploy to production** | `git push origin main:deploy/live` |

---

## 🟢 SUPABASE BACKEND

| Key | Value |
|-----|-------|
| **Project ID** | `wwjpdszkmtnzshbulkon` |
| **Project URL** | `https://wwjpdszkmtnzshbulkon.supabase.co` |
| **Anon Key** | Set via `VITE_SUPABASE_PUBLISHABLE_KEY` env var / GitHub secret — never hardcode |
| **Types Regen** | `npx supabase gen types typescript --project-id wwjpdszkmtnzshbulkon > src/integrations/supabase/types.ts` |

---

## 🏢 MULTI-COMPANY ARCHITECTURE (CRITICAL)

### Company Hierarchy
```
NCG Holdings (Parent)                    [ID: a0000000-0000-0000-0000-000000000001]
├── Yutong Bus Sales (YUT)               [sub-company, shares NCG Holding GL]
├── Sinotruck Sales (SNT)                [sub-company, shares NCG Holding GL]
├── Light Vehicle Sales (LTV)            [sub-company, shares NCG Holding GL]
├── School Bus Operations (SBO)          [sub-company, shares NCG Holding GL]
└── Special Hire (SPH)                   [sub-company, shares NCG Holding GL]

NCG Express (Standalone)                 [ID: 7ece7595-8b7b-46de-8bfc-c1e8e0da7513]
└── Has its own completely isolated COA/GL — NEVER consolidates with NCG Holding

NCG Test Environment (Sandbox)           [ID: f40b0a9d-ae5b-41b3-9188-535ae94c9020]
└── Sub-companies share NCG Test GL — safe for testing
```

### Consolidation Rules
- **NCG Holding sub-companies** → `getEffectiveCompanyId()` returns `NCG_HOLDING_ID`
- **NCG Express** → always returns its own ID (completely isolated)
- `getBusinessUnitCode()` returns the `short_code` for BU-level reporting
- Business unit codes tag every journal entry line

### Access Control
- `super_admin`, `admin`, `finance` roles → see all non-test companies via `can_access_tenant_record()`
- `supervisor`, `staff` → no role-based company scoping; rely on `user_company_access` table entries
- Zero-trust for all other roles unless explicitly granted

---

## 💰 GL POSTING ENGINE

**⚠️ `src/lib/gl-posting-utils.ts` — PROTECTED. Do not modify without engineering approval.**

### Automated GL Functions
| Function | Debit | Credit | Trigger |
|----------|-------|--------|---------|
| `postARInvoiceToGL()` | Trade Receivable | Sales Revenue | AR invoice created |
| `postARReceiptToGL()` | Bank/Cash | Trade Receivable | Payment received |
| `postAPInvoiceToGL()` | Expense/Inventory | Trade Payable | AP invoice approved |
| `postAPPaymentToGL()` | Trade Payable | Bank/Cash | Vendor payment made |

### Atomic DB RPCs (use these for all new GL code)
| RPC | Purpose |
|-----|---------|
| `post_journal_entry_atomic(company_id, entry_date, description, reference, source_module, business_unit_code, lines jsonb)` | Inserts JE + lines + triggers COA update in one DB transaction |
| `adjust_coa_balance_atomic(account_id, delta)` | Race-free COA balance delta — replaces any client-side read-modify-write |

### Payment Flow
1. **Record Payment** → saves to `*_customer_payments` with `pending` status, NO GL impact
2. **Verify** → resolves GL accounts, posts journal entry, status → `verified`
3. **Reverse** → creates contra entry, status → `reversed`, original entry preserved

### Rules
- All JEs validated for debit = credit balance before posting
- `reverseAndDeleteJournalEntry()` — test/draft cleanup ONLY; blocks posted JEs
- WHT is applied at payment time, NOT at invoice creation (`paid_amount` starts at 0)

---

## 🏗️ SOURCE STRUCTURE

```
src/
├── components/
│   ├── accounting/          # Full ERP (50+ components) — finance role gated
│   ├── fleet/               # Bus management
│   ├── special-hire/        # Quotation → booking flow
│   ├── yutong/              # Yutong sales pipeline
│   ├── school/              # School bus per-branch management
│   ├── auth/                # ProtectedRoute, PageAccessGuard, MFAGuard
│   └── layout/              # AppLayout, navigation
├── hooks/
│   ├── useAuth.tsx           # Auth + MFA + role management
│   ├── useAccountingData.ts  # AR/AP/GL data hooks
│   └── useAccountingMutations.ts  # All finance mutations
├── contexts/
│   ├── CompanyContext.tsx    # Multi-company — CRITICAL
│   └── CrewAuthContext.tsx   # Driver/conductor auth
├── integrations/supabase/
│   ├── client.ts            # Supabase singleton (env vars required)
│   └── types.ts             # DB types — currently empty, regenerate before use
├── lib/
│   ├── gl-posting-utils.ts  # ⚠️ PROTECTED — Core GL engine
│   └── utils.ts             # General utilities
└── docs/
    └── finance_system_guidance.md
```

---

## 🗄️ KEY DATABASE TABLES

### Financial Core
| Table | Purpose |
|-------|---------|
| `companies` | Multi-company hierarchy |
| `chart_of_accounts` | COA with `current_balance`, `account_type`, `balance_locked` |
| `journal_entries` | JE headers — `entry_number` has UNIQUE constraint, generated by `journal_entry_seq` |
| `journal_entry_lines` | Double-entry lines |
| `ar_invoices` / `ar_receipts` | Accounts receivable |
| `ap_invoices` / `ap_payments` | Accounts payable |

### RLS Status (as of 2026-05-14)
| Table | SELECT | Write |
|-------|--------|-------|
| `journal_entries` | 🟢 Tenant scoped (`can_access_tenant_record`) | 🟢 Tenant scoped |
| `ar_invoices` / `ar_receipts` | 🟢 Tenant scoped | 🟢 Tenant scoped |
| `ap_invoices` / `ap_payments` | 🟢 Tenant scoped | 🟢 Tenant scoped |
| `ar_credit_notes` / `ap_debit_notes` | 🟢 Tenant scoped | 🟢 Role gated |
| `chart_of_accounts` | 🟡 `USING(true)` — deferred (see below) | 🟢 Role gated |
| `journal_entry_lines` | 🟡 `USING(true)` — deferred (see below) | 🟢 Role gated |

> **COA + JEL RLS is intentionally `USING(true)`** — `supervisor` and `staff` roles need read access for operational pages (school bus payments, Yutong tracking) and have no `user_company_access` entries. Do NOT tighten these policies until `user_company_access` is populated for all operational roles.

---

## 🔐 AUTHENTICATION

### Role Hierarchy
| Role | Access Level |
|------|-------------|
| `super_admin` | Everything |
| `admin` | All modules except super_admin features |
| `supervisor` | Operations (maintenance, allocation, attendance) |
| `finance` | Accounting module + finance stats |
| `staff` | Limited access |
| `driver` / `conductor` | Crew app only |

### Auth Stack
- Supabase Auth (email/password + MFA TOTP)
- `useAuth` hook: `user`, `session`, `userRoles`, `hasRole()`, `mfaFactors`
- 5s timeout on all auth fetches, localStorage cache fallback
- `MFAGuard` wraps sensitive routes (Settings, Executive Dashboard)

---

## 🤖 JULES — NIGHTLY AI MAINTENANCE

Jules runs every night at midnight SLT (18:30 UTC) via `jules-nightly-trigger.yml`.

### Jules MUST do:
1. `npm audit` + safe auto-fix for minor/patch vulnerabilities
2. Supabase security + performance advisory check
3. Memoization scan — wrap expensive renders in `useMemo`
4. TypeScript `any` type replacement
5. Console.log purge from `src/`
6. DRY validation — extract duplicate UI patterns
7. Bundle size guard — alert if `dist/assets/index-*.js` > 12 MB
8. RLS policy optimization (wrap `auth.uid()` in sub-selects)
9. Missing/duplicate index detection
10. TypeScript strict check (`npx tsc --noEmit`)
11. ESLint + build verification
12. Update `CLAUDE.md` development log section
13. Force-push polished build to `staging` branch

### Jules MUST NOT:
- Modify `src/lib/gl-posting-utils.ts` without explicit approval
- Touch major version dependency bumps
- Push a broken build to staging
- Run `npm audit fix --force`
- Tighten RLS on `chart_of_accounts` or `journal_entry_lines` (see RLS section)
- Physically delete or modify `posted` journal entries

---

## 🔄 CI/CD PIPELINE

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | All pushes + PRs | Lint → TypeCheck → Build → Tests |
| `deploy-staging.yml` | Manual / post-CI | Deploy to staging VPS |
| `deploy-production.yml` | Push to `deploy/live` | Zero-downtime deploy to production |
| `jules-nightly-trigger.yml` | Cron 18:30 UTC | Nightly AI maintenance |

### Green Gate Rules
1. No direct push to `main` — all changes via PR
2. CI must pass before deploy
3. Build must complete under 6 GB memory
4. ESLint must pass — no suppressed errors

### VPS
- **IP**: `159.223.82.119` | **OS**: Ubuntu 24.04 LTS
- **Web Server**: Nginx (static files)
- **Production root**: `/var/www/fleetone/FleetONE/dist/`

---

## 📦 KEY DEPENDENCIES

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.76.1 | Backend client |
| `@tanstack/react-query` | ^5.83.0 | Server state |
| `react-hook-form` + `zod` | latest | Forms + validation |
| `framer-motion` | ^12.x | Animations |
| `jspdf` + `jspdf-autotable` | latest | PDF generation |
| `tesseract.js` | ^7.x | OCR |
| `three` + `@react-three/fiber` | latest | 3D rendering |

---

## 📝 DEVELOPMENT LOG

| Date | Change | Author |
|------|--------|--------|
| 2026-05-14 | `25371bff` — WHT reporting, transaction lineage, AR template bulk updater | Abisheka |
| 2026-05-14 | `f350eff2` — Finance security audit patches (CRIT-05, HIGH-03, HIGH-05), AR/AP query expansion | Claude |
| 2026-04-27 | Bootstrap: npm install, build success, CI/CD wired | Antigravity |
| 2026-04-28 | Nginx migrated: Docker proxy → static file serving | Antigravity |
| 2026-05-12 | Odometer Quick-Adjust UI + PDF export added to FuelAnalyticsSection | Antigravity |
