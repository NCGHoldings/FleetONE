

# Update Fleet Roster with Actual Bus Route Schedule Data

## What We're Doing

Your "BUS ROUTE DATA" spreadsheet has the real operational schedule for 70 buses across ~25 routes, with correct trips per day, time slots, start locations, and seat capacity. The current fleet roster has many mismatches — buses marked "Stopped" that are actually running, wrong trip counts (e.g., NG 8223 shows 1 trip but actually does 2), and missing time slots.

We'll write a SQL migration to bulk-update all roster entries and also update the `buses` table capacity where provided. Plus we'll organize the roster by route sections matching your spreadsheet groupings.

## Data Mapping (Spreadsheet → Roster)

From your spreadsheet, each bus gets:

| Spreadsheet Field | Updates To |
|---|---|
| Route name (e.g., "Colombo - Jaffna") | `route_label` + `section` |
| Trip count per bus | `trips_per_day` |
| Time Slot / End Time | `turn_01_time` / `turn_02_time` |
| Seat Capacity | `buses.capacity` |
| Running status | `remark = 'Running'` (or 'Stopped' for NOT RUNNING buses) |
| Sort order | `sort_order` by route section sequence |

## Key Corrections

**Buses changing from Stopped → Running** (currently wrong):
- NI 8222, NI 8223, NI 8244, NI 8229, NI 8250, NI 8251, NI 8253, NI 8254, NI 8255, NI 8256
- NG 8256, NG 8259, NG 8260, NG 8261

**Buses staying Stopped** (NOT RUNNING per your data):
- NG 8244 (Nuwara Eliya — not running), NG 8255 (Meegoda-Pettah — not running), NG 8257 (Panadura-Pettah — not running)

**Trips per day corrections** (examples):
- NG 8220: 1 → 2 (Jaffna + Kandy XL)
- NG 8223: 1 → 2 (Jaffna + Passara)
- NI 8222: 1 → 2 (Jaffna + Passara)
- NG 8256: 1 → 4 (Kaduwela-Moratuwa, 4 round trips)
- NG 8259: 1 → 3 (Horana-Kaduwela, 3 round trips)
- NI 8229: 1 → 4 (Mirigama-Panadura, 4 legs)

**Section groupings**: Routes will be organized into sections matching the spreadsheet order (Colombo-Jaffna, Colombo-Badulla Highway, Passara-Colombo, etc.)

## Implementation

### 1. SQL Migration — Bulk Update Roster

One large migration that:

a) Updates `route_label`, `trips_per_day`, `turn_01_time`, `turn_02_time`, `remark`, `section`, `sort_order` for each bus in `fleet_master_roster` (matching by bus_no → bus_id)

b) Updates `buses.capacity` where seat capacity is provided in the spreadsheet

c) Sets correct route sections for visual grouping in the Fleet Sheet

### 2. No Code Changes Needed

The Fleet Sheet UI already:
- Groups by `section` headers
- Expands rows based on `trips_per_day`
- Shows turn times in the grid
- Creates trips per `trips_per_day` count

The data update alone will make the Fleet Sheet match your actual operations.

## Files to Change

- **New SQL migration** — bulk UPDATE statements for ~70 buses in `fleet_master_roster` + capacity updates in `buses`

## Result

- Fleet Sheet shows correct trips per bus (e.g., NG 8223 shows 2 trip rows, NG 8256 shows 4)
- All running buses marked "Running" with correct time slots
- Route sections organized by corridor (Colombo-Jaffna, Badulla Highway, Kandy XL, etc.)
- Seat capacity updated in bus master data
- "Create Remaining" will generate the right number of daily trips per bus

