# SYSTEM_MEMORY.local.md — FleetONE Enterprise
> **MASTER LOGIC MAP** | AI Guardrail Document | Do NOT commit to public repositories.
> Last Updated: 2026-04-27 | Author: Antigravity (Bootstrap)

---

## 🔴 DEPLOYMENT TRUTHS (Source of Authority)

| Key | Value |
|-----|-------|
| **Project Name** | FleetONE |
| **Repository** | NCGHoldings/FleetONE |
| **Production URL** | `https://fleetone.ncg.lk` |
| **Staging URL** | `https://staging.fleetone.ncg.lk` |
| **Framework** | React 18 + Vite 5 + TypeScript 5 |
| **Package Version** | 1.4.0 |
| **Node Target** | 20 (LTS) |
| **Build Command** | `NODE_OPTIONS="--max-old-space-size=6144" npm run build` |
| **Install Command** | `npm install --legacy-peer-deps` |
| **Build Output** | `dist/` |
| **PWA Mode** | `generateSW` (Workbox v1.2.0) |

---

## 🟢 SUPABASE BACKEND (FleetONE Project)

| Key | Value |
|-----|-------|
| **Project ID** | `wwjpdszkmtnzshbulkon` |
| **Project URL** | `https://wwjpdszkmtnzshbulkon.supabase.co` |
| **Anon Key** | See `.env.example` (never hardcode in source) |
| **Supabase CLI** | `supabase/` directory initialized |
| **Types Regen Command** | `npx supabase gen types typescript --project-id wwjpdszkmtnzshbulkon > src/integrations/supabase/types.ts` |

> ⚠️ The `.env.example` contains the anon key for reference. The actual `.env` must NEVER be committed.

---

## 🏗️ ARCHITECTURE MAP

### Technology Stack
- **UI Layer**: React 18.3 + shadcn/ui (Radix UI primitives)
- **State**: TanStack Query v5 (server state) + React Context (auth/global)
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS v3 + tailwind-merge + CVA
- **Charts**: Recharts v3, Nivo (radar, sankey)
- **3D**: Three.js + React Three Fiber + Drei
- **Maps**: Google Maps API
- **PDF**: jsPDF + jspdf-autotable
- **Drag/Drop**: @hello-pangea/dnd
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion v12
- **OCR**: Tesseract.js v7
- **Flow Diagrams**: @xyflow/react
- **Excel**: xlsx + xlsx-js-style

### Key Source Directories
```
src/
├── components/      # Feature components (accounting/, fleet/, school-bus/, special-hire/, etc.)
├── hooks/           # Data hooks (useAccountingData, useJobController, etc.)
├── pages/           # Route-level pages
├── contexts/        # Auth, Company, ExternalSystem contexts
├── integrations/    # Supabase client + generated types
├── lib/             # Utilities (gl-posting-utils, pdf, autoIssueDetector)
└── types/           # Shared TypeScript types
```

---

## 🔐 CI/CD — THE GREEN GATE

### Existing GitHub Actions Workflows
| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Lint → Type Check → Build → Unit Tests (triggers on all pushes + PRs to main) |
| `.github/workflows/deploy.yml` | Manual deploy to VPS (SSH via appleboy) — requires CI to pass |
| `.github/workflows/magiya.yml` | (Review and document purpose) |
| `.github/workflows/mirror.yml` | Repository mirror sync |
| `.github/workflows/sync-lovable.yml` | Lovable ↔ GitHub bidirectional sync |

### Required GitHub Secrets (for deploy.yml)
- `VPS_HOST` — Production server IP
- `VPS_USER` — SSH username
- `VPS_SSH_KEY` — Private SSH key (ED25519 recommended)
- `VPS_APP_DIR` — Path to app on server (e.g. `/var/www/fleetone`)

### Green Gate Rules
1. **No direct push to `main`** — all changes via PR
2. **CI must pass** before deploy workflow can proceed
3. **Build must complete** under 6 GB memory limit
4. **ESLint must pass** — no suppressed errors allowed

---

## 🤖 AI GUARDRAILS

### Known Build Warnings (Non-Blocking)
- Chunk size warning: `index-*.js` ~11.5 MB (monolithic — code splitting pending)
- `gl-posting-utils.ts` mixed static/dynamic import warning (architectural — do not "fix" without full audit)
- Tailwind `duration-[20s]` ambiguity in animation classes

### AI Amnesia Prevention Rules
1. **NEVER assume the database schema** — always regenerate types from live Supabase
2. **NEVER remove `--legacy-peer-deps`** — required for peer dependency compatibility
3. **NEVER increase Vite chunk size limit** as a substitute for actual code splitting
4. **ALWAYS use `NODE_OPTIONS="--max-old-space-size=6144"`** for builds (large bundle)
5. **NEVER commit `.env`** — only `.env.example` with placeholder values
6. **gl-posting-utils.ts is a core GL engine** — treat as protected infrastructure
7. **The `supabase/` directory is initialized** — do not run `supabase init` again

### Related Systems
- **GarageOne** (sister system, same architectural patterns — `/Users/staff/Documents/Garage-One/`)
- **StoresOne** (planned — not yet initialized)

---

## 📦 DEPENDENCY TRUTH TABLE

### Core Enterprise Dependencies (Verified Present)
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.76.1 | Backend client |
| `lucide-react` | ^0.462.0 | Icon library |
| `date-fns` | ^3.6.0 | Date utilities |
| `@tanstack/react-query` | ^5.83.0 | Server state |
| `react-hook-form` | ^7.61.1 | Form management |
| `zod` | ^3.25.76 | Schema validation |
| `framer-motion` | ^12.23.24 | Animations |
| `jspdf` + `jspdf-autotable` | ^4.2 / ^5.0 | PDF generation |

### Security Audit Note (2026-04-27)
- 21 vulnerabilities found (9 moderate, 11 high, 1 critical)
- Run `npm audit` for details before next production deploy
- Do NOT run `npm audit fix --force` without review (breaking changes risk)

---

## 🗓️ BOOTSTRAP LOG

| Date | Action | Author |
|------|--------|--------|
| 2026-04-27 | `npm install` — 1,173 packages installed, exit 0 | Antigravity |
| 2026-04-27 | `npm run build` — ✅ success in 29.99s, exit 0 | Antigravity |
| 2026-04-27 | `SYSTEM_MEMORY.local.md` created | Antigravity |
| 2026-04-27 | `.coderabbit.yaml` created — AI PR guardian active | Antigravity |
| 2026-04-27 | `ci-check.yml` created — Green Gate fires on every push | Antigravity |
| 2026-04-27 | `deploy-staging.yml` + `deploy-production.yml` created — zero-downtime pattern | Antigravity |
| 2026-04-27 | `nightly_maintenance.md` created — Jules AI loop established | Antigravity |
| 2026-04-27 | All GitHub secrets configured — CI/CD fully wired ✅ | Staff |

## 🔐 GITHUB SECRETS STATUS (2026-04-27)

| Secret | Scope | Status |
|--------|-------|--------|
| `VPS_HOST` | production environment | ✅ Set |
| `VPS_SSH_KEY` | production environment | ✅ Set |
| `VPS_USER` | production environment | ✅ Set |
| `VPS_APP_DIR` | production environment | ✅ Set |
| `GH_PAT` | repository + production | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | repository | ✅ Set |
| `VITE_SUPABASE_URL` | repository | ✅ Set |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | repository | ✅ Set |
| `VITE_SUPABASE_ANON_KEY` | repository | ✅ Set |

---
*This file is owned by the engineering team. Update this file after every major architectural decision, infrastructure change, or production incident.*
