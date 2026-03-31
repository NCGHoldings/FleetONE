
Issue summary

I reviewed the screenshot and the upload code. The file is being read correctly; the failure happens before insert.

Do I know what the issue is? Yes.

What is actually wrong

1. Every row is being marked as a “section header”, so `handleImport()` filters out all rows before insert.
2. CSV is already supported by the uploader, but CSV would hit the same bug because the problem is in the shared row-skip logic, not the file type.
3. There are two frontend mapping bugs making this worse:
   - blank headers can get false auto-matches
   - hidden blank-header columns can shift manual mapping updates onto the wrong original column

Why this happens

- In `isSectionHeaderRow()` the code counts optional fields like `seat_config` and `color`, and it also counts duplicate mappings like `VIN NO` + `CHASSIS NO` both mapped to `chassis_no`.
- On your file, real vehicle rows still have some empty optional columns, so the rule `mappedCellsEmpty >= 3` incorrectly classifies all rows as headers.
- In the hooks, `autoDetectColumnMapping()` can treat empty headers as a match because `pattern.includes('')` is true.
- In the mapping table, blank columns are hidden with `.filter(...)`, but the displayed row index is still used for `updateMapping(idx, ...)`, so edits can apply to the wrong source column.

Implementation plan

1. Fix section-header detection in all 3 upload components
   - Files:
     - `src/components/yutong/YutongVehicleDataUpload.tsx`
     - `src/components/sinotruck/SinotrukVehicleDataUpload.tsx`
     - `src/components/lightvehicle/LightVehicleVehicleDataUpload.tsx`
   - Change the skip logic to only use unique required vehicle identifiers:
     - `model`
     - `engine_no`
     - `chassis_no`
   - Ignore optional fields like `color` and `seat_config` for header detection.
   - Deduplicate repeated mapped targets so two columns mapped to `chassis_no` do not count twice.
   - Add a lightweight text check so only real section labels like “Customers”, “Exstock”, etc. are skipped.

2. Fix blank-header auto-detection in all 3 management hooks
   - Files:
     - `src/hooks/useYutongVehicleDataManagement.ts`
     - `src/hooks/useSinotrukVehicleDataManagement.ts`
     - `src/hooks/useLightVehicleVehicleDataManagement.ts`
   - If a header is blank, force `mappedTo: null`.
   - Do not run fuzzy matching against empty strings.

3. Fix mapping UI index alignment
   - In the 3 upload components, keep the original column index when rendering only non-empty headers.
   - This ensures changing a visible mapping updates the correct source column.

4. Add safer import guardrails
   - If `validDataCount === 0`, show a clear warning explaining that rows are being treated as headers and must be remapped/reviewed.
   - Keep import disabled when there are no valid vehicle rows.
   - Show a clearer validation message if required fields are missing.

5. Small same-file cleanup while touching the upload screens
   - Correct the shipment display typo (`shipment_nohipment_name`) in the 3 upload components.
   - This is not the root cause, but it is a visible bug in the same area.

Technical notes

```text
Current flow:
file parsed -> mappings built -> headerRowIndices computed -> all rows filtered out -> insert gets 0 records

Target flow:
file parsed -> mappings built correctly -> only real section labels skipped -> valid rows inserted
```

CSV answer

- Yes, you can use CSV.
- The uploader already accepts `.csv`.
- After this fix, both Excel and CSV should work through the same import flow.

Expected result after fix

- Your Batch 6/manual file should no longer show “52 section header(s) will be skipped”.
- The preview rows should stay as real vehicle rows.
- The import button should show the real vehicle count.
- Clicking import should insert rows into `yutong_vehicle_records`.
- The same fix will protect Sinotruck and Light Vehicle uploads too.
