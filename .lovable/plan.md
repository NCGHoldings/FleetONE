
# Fix: Remove System Users from Driver & Conductor Profiles

## Root Cause

The `sync-staff-registry` edge function pulls **ALL profiles** (including system users) and inserts them into `staff_registry` as `type: 'driver'` by default (line 217). This is why "Abi Money", "Admin User", "gm_nex", "hrm_nex", and other non-driver system users appear on the Driver & Conductor Profiles page.

Currently there are **55 drivers** and **22 conductors** in the table, but many of these "drivers" are actually system users.

## Solution

### Step 1: Fix the sync function to stop importing profiles

**File: `supabase/functions/sync-staff-registry/index.ts`**

Remove the entire "Extract from profiles" section (lines 203-225). The sync function should only extract staff names from:
- `daily_trips` notes (where actual driver/conductor names are recorded)
- `driver_allocations` notes

System users from the `profiles` table should never be auto-added as drivers.

### Step 2: Clean up incorrect data from the database

Run a SQL migration to remove staff_registry entries that were incorrectly synced from profiles. These can be identified by:
- `notes` containing `'Auto-synced from profiles'`
- No attendance, trip, or commission records linked to them

```sql
DELETE FROM staff_registry
WHERE notes LIKE '%Auto-synced from profiles%'
  AND id NOT IN (SELECT DISTINCT staff_registry_id FROM staff_attendance WHERE staff_registry_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT staff_id FROM staff_commissions WHERE staff_id IS NOT NULL)
  AND id NOT IN (
    SELECT DISTINCT sa.id FROM staff_registry sa
    JOIN daily_trips dt ON dt.notes::jsonb->>'driver' ILIKE sa.staff_name
       OR dt.notes::jsonb->>'conductor' ILIKE sa.staff_name
  );
```

Before deleting, we will first check how many records would be affected and ensure no legitimate driver/conductor data is lost.

### Step 3: Verify remaining data

After cleanup, verify only real drivers and conductors remain. The page should then show accurate data.

## Impact

- System users like "Abi Money", "Admin User", "gm_nex", "hrm_nex" will be removed from the Driver & Conductor Profiles page
- Future syncs will no longer pull system users into the staff registry
- Real drivers and conductors (from trip records) remain unaffected
- No mapping or foreign key issues since these fake entries have no linked transactions
