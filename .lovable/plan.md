

# Fix: COA Upload Merge Mode -- Use Upsert Instead of Manual Lookup

## Problem

The merge upload fails with "0 success, 222 errors" because the existing account lookup query silently fails (no error check), leaving the lookup map empty. All 222 rows then go to the INSERT path and hit the unique constraint `(company_id, account_code)` since those accounts already exist in the database.

## Solution

Replace the fragile select-then-update/insert pattern with Supabase's built-in `upsert` operation, which atomically handles "insert or update" in a single call using the existing unique constraint `chart_of_accounts_company_account_code_key` on `(company_id, account_code)`.

### File: `src/components/accounting/ChartOfAccountsUpload.tsx`

**Replace the entire `handleUploadMerge` function** with a simpler upsert-based approach:

```typescript
const handleUploadMerge = async () => {
  if (!companyId) return;
  setIsUploading(true);
  setUploadProgress(0);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    let successCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);
      const records = batch.map(row => {
        const rec = buildRecord(row);
        // Remove current_balance so upsert doesn't reset existing balances
        const { current_balance, ...upsertRec } = rec;
        return upsertRec;
      });

      const { error } = await supabase
        .from("chart_of_accounts")
        .upsert(records, {
          onConflict: "company_id,account_code",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`COA upsert batch error:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }

      setUploadProgress(Math.round(((i + batch.length) / parsedData.length) * 100));
    }

    // Log upload history
    await supabase.from("coa_upload_history").insert({
      uploaded_by: user?.id,
      total_records: parsedData.length,
      status: errorCount === 0 ? "completed" : "partial",
      file_name: file?.name,
      notes: `Merge mode (upsert): ${successCount} success, ${errorCount} errors`,
    });

    setUploadStats({ total: parsedData.length, success: successCount, errors: errorCount });

    if (errorCount === 0) {
      toast.success(`Merged ${successCount} accounts successfully`);
      onUploadComplete();
      setTimeout(() => setOpen(false), 2000);
    } else {
      toast.warning(`Merged ${successCount} accounts with ${errorCount} errors`);
    }
  } catch (error) {
    console.error("Merge error:", error);
    toast.error("Failed to merge chart of accounts");
  } finally {
    setIsUploading(false);
  }
};
```

### Why This Works

- `upsert` with `onConflict: "company_id,account_code"` tells Postgres: if a row with the same `(company_id, account_code)` exists, UPDATE it; otherwise INSERT it
- No separate SELECT query needed, so no silent failure risk
- `current_balance` is excluded from the upsert record so existing balances are preserved (Postgres only updates the columns provided)
- Batch processing in groups of 50 for performance
- All existing foreign key references (journal entries, budgets, GL settings) remain intact since account IDs are preserved

### Impact

- All 222 accounts will be correctly merged (existing ones updated, new ones inserted)
- Existing balances preserved
- No orphaned references
- Simpler, more reliable code

