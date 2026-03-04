

# Fix: Ensure Tax Invoice Template Appears in Document Templates List

## Problem
The `tax_invoice` template type migration may have failed silently because it lacks an `ON CONFLICT` clause — if the row already exists, the INSERT fails. Additionally, even if the type exists, the actual template records for each company only get created when you click "Initialize All Templates" or "Replace All Templates".

## Changes

### 1. Fix the migration to be idempotent
**File: `supabase/migrations/20260304182304_f0fc2dcd-8319-48c7-ba5e-beebeb4ea1d0.sql`**
- Add `ON CONFLICT (type_code) DO UPDATE SET ...` so the migration works whether or not the row already exists

### 2. After the migration runs successfully
- Go to **Settings → Document Templates**
- Change the "Filter by Document Type" dropdown from "AR Invoice / Sales Invoice" to either **"All Document Types"** or **"Sri Lanka Tax Invoice"**
- Click **"Initialize All Templates"** to create the tax invoice template for all companies
- The tax invoice template will then appear in the grid

Only the tax invoice template type registration is being changed. No other templates are affected.

