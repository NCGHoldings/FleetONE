
## Fix required
New Special Hire quotations are still saving the old account name because the creation flow is not scoped to the active company’s finance settings, and the database migration/defaults still contain the old value `NCG EXPRESS (PVT) LTD`.

## Root cause found
1. `src/components/special-hire/SpecialHireForm.tsx`
   - On create, it fetches `special_hire_finance_settings` with:
   - `select(...).limit(1).maybeSingle()`
   - There is no `.eq("company_id", effectiveCompanyId)`, so it can pick the wrong row.
2. `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`
   - Same issue: it fetches finance settings without filtering by company.
3. `supabase/migrations/20260401044341_01577e87-92f6-45e2-91ed-ff4bf869a5db.sql`
   - Still sets `quotation_account_name` default/update to `NCG EXPRESS (PVT) LTD`.
4. `supabase/migrations/20260401051912_a1414dba-8029-4dbd-9c77-c6f821f60a03.sql`
   - Seed insert also still contains `NCG EXPRESS (PVT) LTD`.

## What to change

### 1. Fix quotation creation to use the correct company settings
File: `src/components/special-hire/SpecialHireForm.tsx`
- Import/use company context
- Get `effectiveCompanyId` via the existing company helper
- Change the finance settings query to:
  - filter by `.eq("company_id", effectiveCompanyId)`
  - then read `quotation_bank_name`, `quotation_account_name`, `quotation_account_no`
- Keep current fallback values:
  - Bank: `Commercial Bank - Nugegoda`
  - Account Name: `NCG Holding (Pvt) Ltd`
  - Account No: `1001077213`

### 2. Fix repeat quotation flow too
File: `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`
- Apply the same company-scoped finance settings lookup
- This ensures repeated quotations also save `NCG Holding (Pvt) Ltd`

### 3. Correct DB defaults/seeds so future rows cannot fall back to old branding
Files:
- `supabase/migrations/20260401044341_01577e87-92f6-45e2-91ed-ff4bf869a5db.sql`
- `supabase/migrations/20260401051912_a1414dba-8029-4dbd-9c77-c6f821f60a03.sql`

Update old values:
- `NCG EXPRESS (PVT) LTD` → `NCG Holding (Pvt) Ltd`

This prevents future environments / reset databases from reintroducing the old account name.

## Expected result
- Newly created quotations will save the bank snapshot with:
  - Account Name: `NCG Holding (Pvt) Ltd`
  - Bank Name: `Commercial Bank - Nugegoda`
  - Account No: `1001077213`
- Preview will then show the correct value because it already renders from `payment_account_name`
- Old quotations remain unchanged

## Technical note
The preview component is already correct. The issue is upstream during data capture:
```text
Preview reads:
quotation.payment_account_name

Current bug:
new quotation creation fetches an unscoped finance settings row
or inherits old DB default/seed value

Fix:
scope finance settings by company + update stale migration defaults
```
