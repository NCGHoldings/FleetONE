
Fix the regression by restoring true point-in-time behavior for Special Hire quotation bank details.

1. What went wrong
- Old quotations changed because `QuotationPreview.tsx` now falls back to Commercial Bank whenever `payment_*` snapshot fields are empty.
- That means legacy quotations with null bank snapshot fields are rendered like new quotations.
- New quotation creation and repeat flows also still fetch finance settings without a `company_id` filter, so the snapshot source is not safely company-scoped.
- Edit/version paths currently preserve existing snapshot behavior indirectly, but the preview fallback broke historical immutability.

2. What to change

- `src/components/special-hire/QuotationPreview.tsx`
  - Stop using Commercial Bank as a universal fallback for every quotation.
  - Render bank details in this order:
    1. quotation’s saved `payment_*` snapshot fields
    2. legacy fallback only for old records with no snapshot: Sampath Bank / 1934 1401 7578
  - This ensures historical quotations stay historical.

- `src/components/special-hire/SpecialHireForm.tsx`
  - Use the effective company logic already used in Special Hire finance hooks.
  - Fetch `special_hire_finance_settings` by `company_id`.
  - Keep Commercial Bank snapshot only for brand-new quotations (`!isEditing`).
  - Do not overwrite bank snapshot fields during normal edit.

- `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`
  - Also fetch finance settings by effective `company_id`.
  - Keep current behavior of re-snapshotting current bank details for a repeated quotation, because that is a new quotation.

- `src/components/special-hire/EditQuotationModal.tsx`
  - Ensure version creation keeps the original quotation’s saved `payment_*` fields unless you intentionally want versioned quotations to remain tied to the original snapshot.
  - This avoids accidental re-banking of older quotation histories.

3. Expected behavior after fix
- Old quotation with no snapshot fields:
  - shows old Sampath details
- Old quotation with saved old snapshot:
  - shows old Sampath details
- Newly created quotation:
  - shows Commercial Bank details
- Repeated quotation:
  - shows Commercial Bank details because it is a new quotation
- Edited existing quotation:
  - keeps its original bank snapshot
- Versioned quotation:
  - keeps the original quotation’s bank snapshot unless explicitly changed by business rule

4. Technical details
```text
Correct rule:
historical document display = stored snapshot
if no snapshot exists and document is legacy = old bank fallback
new quotation creation only = snapshot current finance settings

Do not use:
preview fallback = always Commercial Bank
because that changes history at render time
```

5. Files to update
- `src/components/special-hire/QuotationPreview.tsx`
- `src/components/special-hire/SpecialHireForm.tsx`
- `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`
- `src/components/special-hire/EditQuotationModal.tsx`

6. Result
- Past quotations stay unchanged
- Only new quotations use Commercial Bank
- Repeat flow still uses the new bank correctly
- Multi-company Special Hire setup uses the right finance settings row
