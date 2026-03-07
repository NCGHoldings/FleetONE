

# Fix Fleet Excel Import — Not Completing

## Root Cause

Two issues prevent the import from completing:

1. **Unique constraint violation on `bus_id`**: The `fleet_master_roster` table has a UNIQUE constraint on `bus_id`. There are already 73 roster entries (from the "Bulk Add All" operation). When the import tries to INSERT a row for a bus that already has a roster entry, it silently fails. The code only sets `existingRosterId` during file parsing — but for auto-created buses, this is always `undefined`, so it always tries INSERT (which fails).

2. **No error handling on roster writes**: The insert/update calls at lines 288-299 don't check for errors, so failures are completely silent. The import appears to "finish" but nothing actually saved.

## Fix

**File: `src/components/fleet/FleetExcelImport.tsx`**

1. **Re-fetch roster after auto-creating buses** — after creating missing buses in the `buses` table, re-query `fleet_master_roster` to detect which new buses already have roster entries (from previous "Bulk Add All")

2. **Use upsert pattern** — replace separate insert/update with `upsert` using `bus_id` as the conflict key, so repeated imports cleanly update existing entries

3. **Add error handling** — check and log errors from each Supabase call; count failures and report them in the toast

4. **Batch operations** — use bulk insert/upsert where possible instead of 60+ sequential API calls

### Key code change (simplified):
```typescript
// After auto-creating buses, re-fetch roster
const { data: currentRoster } = await supabase
  .from('fleet_master_roster').select('id, bus_id');
const rosterMap = new Map(currentRoster?.map(r => [r.bus_id, r.id]));

// For each matched row, use upsert
for (const row of matchedRows) {
  const existingId = rosterMap.get(row.busId!);
  if (existingId) {
    await supabase.from('fleet_master_roster')
      .update(payload).eq('id', existingId);
  } else {
    await supabase.from('fleet_master_roster')
      .insert({ bus_id: row.busId!, ...payload });
  }
}
```

