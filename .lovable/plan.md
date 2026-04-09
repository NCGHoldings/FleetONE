

# Clean Fleet Master Roster — Keep Only Your 70 Operational Buses

## Current State
- **119** active roster entries (66 running + 53 stopped)
- The 53 stopped buses are old/retired vehicles cluttering the spreadsheet
- You want **only** the 70 buses from your operational schedule

## What Will Change

### 1. Database Migration — Deactivate Non-Operational Buses
Create a migration that sets `is_active = false` on all `fleet_master_roster` entries whose bus is **not** in your 70-bus list.

The 70 buses to KEEP (extracted from your list):
```text
NG 8227, NG 8228, NI 8220, NI 8223, NG 8262, NG 8268, NI 8222, NG 8247, NG 8243, NG 8246,
NG 8241, NG 8242, NG 8266, NG 8223, NG 8222, NG 8265, NG 8264, NG 8245, NG 8244, NG 8280,
NG 8220, NG 8224, NG 8225, NG 8226, NG 8229, NG 8258, NI 8244,
NB 1946, NC 4832, ND 4883, NE 0251, NE 2147, ND 6932, NC 7632,
NE 2200, NE 2201,
NG 8260, NG 8261, NE 0762, NE 0746,
NB 7377, NB 7414, NC 8430, NC 8222,
NE 2511, NI 8253, NI 8254, NI 8255, NI 8256, NI 8229,
NG 8255, NG 8257, ND 1397,
NE 2143, ND 3470, ND 3469, ND 0295,
NE 2149, ND 5265, NG 8259, NE 1184, NG 8256, NC 7712,
NE 2521, NE 2150, NE 2152, NI 8250, NI 8251, ND 9155
```

The migration will:
- Match each bus_no to the `buses` table
- Set `is_active = false` on any `fleet_master_roster` row whose bus is NOT in this list
- Also update NG 8244, NG 8255, NG 8257 remarks to reflect "NOT RUNNING" status from your schedule
- Keep ND 9817 (currently stopped Jaffna) deactivated since it's not on your list

### 2. No Code Changes Needed
The spreadsheet already filters by `is_active = true`. Once the migration runs, the spreadsheet will show exactly your 70 buses.

## Result
- Fleet master spreadsheet shows **only** your 70 operational buses
- Old/retired buses are hidden but not deleted (can be reactivated if needed)
- All route assignments and data remain intact for the 70 active buses

