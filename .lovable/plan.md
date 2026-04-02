
Fix Special Hire quotation bank details and overnight charge text by correcting both the data source and the preview logic.

1. What I found
- The preview is still coded to fall back to the old bank:
  - `QuotationPreview.tsx` shows `1934 1401 7578` and `Sampath Bank, Nugegoda` whenever the quotation row has missing snapshot fields.
- New quotation creation is fetching bank settings incorrectly:
  - `SpecialHireForm.tsx` reads `special_hire_finance_settings` with `.single()` and no `company_id` filter.
  - In a multi-company setup this can return the wrong row or no reliable row, so new quotations may save blank/mismatched bank snapshot fields.
- The “Extra Charges” section always prints generic extra-charge text and does not respect your request to remove overnight wording from the quotation.
- There is also a repeat/duplicate path that copies old quotation data as-is, which can carry old bank details forward into new quotations.

2. Root cause
```text
Wrong bank keeps appearing because:
preview fallback = old Sampath values
+
new quotation snapshot query = not company-scoped
+
duplicate quotation flow = copies old snapshot fields forward

Overnight text keeps appearing because:
QuotationPreview always renders fixed extra-charge lines
instead of conditionally hiding overnight wording
```

3. Implementation plan
- Update `src/components/special-hire/SpecialHireForm.tsx`
  - Use the same effective company logic already used by Special Hire finance hooks.
  - Fetch `quotation_bank_name`, `quotation_account_name`, `quotation_account_no` by the effective `company_id`, not global `.single()`.
  - Add a safe fallback to the new Commercial Bank details if settings are missing.
- Update `src/components/special-hire/QuotationPreview.tsx`
  - Remove fallback to old Sampath details in the live preview.
  - Prefer quotation snapshot fields first.
  - If snapshot is empty, fall back to the configured new Commercial Bank values, not Sampath.
  - Make the “Extra Charges” text conditional:
    - keep per-km line
    - keep per-hour line if needed
    - remove overnight line/text from the customer quotation output
- Update `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`
  - Do not blindly copy old `payment_*` bank snapshot fields into new repeated quotations.
  - Re-snapshot current bank details for the new quotation, so future repeated quotations use the new bank account.
- Review version/edit paths
  - Ensure quotation versioning keeps existing snapshot fields for old quotations unless explicitly regenerated as a brand-new quotation.
  - This preserves history while fixing future documents.

4. Files to modify
- `src/components/special-hire/SpecialHireForm.tsx`
- `src/components/special-hire/QuotationPreview.tsx`
- `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx`

5. Expected result
- Future Special Hire quotations show:
  - Account No: `1001077213`
  - Account Name: `NCG EXPRESS (PVT) LTD`
  - Bank Name: `Commercial Bank - Nugegoda`
- Old quotations keep their historic snapshot if they were intentionally preserved.
- Repeated/new quotations no longer reuse old Sampath details.
- Overnight charge wording is removed from the quotation preview/output so it no longer shows again.

6. Technical note
- If the quotation visible in your screenshot is an older record that already saved old `payment_*` values, the system will keep showing that old value until that specific quotation snapshot is corrected or a new quotation/version is generated under the fixed logic.
- So this fix should address both:
  - the code bug for all future quotations
  - the regression path that is still carrying old values into new/repeated quotations
