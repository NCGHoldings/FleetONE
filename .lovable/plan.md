

# Fix: Roster Data Gaps — Missing Buses and Incorrect trips_per_day

## What the Database Shows

| Metric | Expected | Actual | Gap |
|--------|----------|--------|-----|
| Active buses in roster | 46 | 43 | 3 missing |
| Buses with trips_per_day=2 | 3 (8241, 8242, 2511) | 1 (NE 2511 only) | 2 not set |
| Total eligible trips | 49 | 39 (from roster logic) | 10 short |

### Non-running buses (correctly excluded):
- NB 1946 — Repair
- NC 8222 — Paint
- NG 8229 — Repair
- NG 8244 — Temporary Allocated
- NG 8249 — Hire

### Data issue 1: NG 8241 and NG 8242 have `trips_per_day = 1` but should be 2
These two buses already have 2 trip records for April 1 (created manually or by an older logic), but the roster still says `trips_per_day = 1`. The "Create Remaining" logic uses the roster value, so it won't create their 2nd trips going forward.

**Fix**: Migration to set `trips_per_day = 2` for NG 8241 and NG 8242.

### Data issue 2: 3 buses are missing from the roster entirely
You expect 46 active buses but only 43 exist. Need to identify which 3 buses should be added.

**Fix**: I need you to tell me which 3 buses are missing, OR I can query all buses in the `buses` table that are NOT in the roster so you can pick.

## Implementation

### Step 1: Fix trips_per_day for NG 8241 and NG 8242
SQL migration to update `fleet_master_roster` setting `trips_per_day = 2` for these two buses.

### Step 2: Identify and add missing 3 buses
Query buses table to find active buses not in the roster, then add them.

### Step 3: Verify count
After fixes: 46 running buses × 1 trip + 3 buses × 1 extra trip = 49 total eligible trips.

## The Trip Creation Logic Is Correct
The code changes from the previous fix are working properly:
- Only "Running" buses create trips
- Non-running statuses (Hire, Repair, Paint, etc.) are excluded
- Multi-trip sequences are handled correctly

The problem is **data**, not code. Once the roster data is corrected, "Create Remaining" will show the correct count of 49.

## Files to Change
- New SQL migration — update `trips_per_day` for NG 8241, NG 8242; add missing buses to roster

