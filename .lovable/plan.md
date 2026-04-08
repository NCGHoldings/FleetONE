

# Route Management Overhaul — Group Routes by Corridor & Clean Duplicates

## Current Problem

The Route Dictionary has 33 public routes but many are duplicates or return-legs of the same corridor:

| Duplicate Pair | Should Be |
|---|---|
| "Jaffna To Moratuwa" (R17559903319470) + "Jaffna - Moratuwa" (87R) | Merge into "Jaffna - Moratuwa" (87R) |
| "Moratuwa To Jaffna" (R17559903319471) + "Moratuwa - Jaffna" (87) | Merge into "Moratuwa - Jaffna" (87) |
| "Colombo - Jaffna" (CJ-01) + "Colombo - Jaffna A9" (R105) | Merge into "Colombo - Jaffna" (CJ-01) |
| "Colombo - Kandy" (CK-01) + "Colombo - Kandy Express" (R101) | Merge into "Colombo - Kandy" (CK-01) |

Additionally, routes that are return-legs of the same corridor should be **grouped** visually:

```text
📍 Badulla ↔ Makumbura Corridor
   ├── Route 15:  Badulla to Makumbura
   └── Route 15R: Makumbura to Badulla

📍 Moratuwa ↔ Jaffna Corridor
   ├── Route 87:  Moratuwa - Jaffna
   └── Route 87R: Jaffna - Moratuwa
```

## Solution — Two Parts

### Part 1: Add Route Grouping (corridor concept)

**Database**: Add a `route_group` column to the `routes` table. Routes sharing a corridor get the same group name (e.g., "Badulla - Makumbura"). This is optional — ungrouped routes display normally.

```sql
ALTER TABLE routes ADD COLUMN route_group text;

-- Group known corridors
UPDATE routes SET route_group = 'Badulla - Makumbura' WHERE id IN ('2acef7d4-...', '086aabc2-...');
UPDATE routes SET route_group = 'Moratuwa - Jaffna' WHERE id IN ('f8915451-...', 'ef2162a1-...');
UPDATE routes SET route_group = 'Nittambuwa - Panadura' WHERE id IN ('5b37dea9-...', '4b8d9e0c-...');
UPDATE routes SET route_group = 'Colombo - Rathnapura' WHERE id IN ('95ad6f87-...', '1526dfcc-...');
UPDATE routes SET route_group = 'Kegalle - Colombo' WHERE id IN ('b2222712-...', 'c0342152-...');
```

### Part 2: Merge true duplicates via migration

Merge duplicate routes (same corridor, just different naming) using the existing merge logic — update all referencing tables then delete the duplicate:

- Merge "Jaffna To Moratuwa" → "Jaffna - Moratuwa" (87R)
- Merge "Moratuwa To Jaffna" → "Moratuwa - Jaffna" (87)
- Merge "Colombo - Jaffna A9" → "Colombo - Jaffna" (CJ-01)
- Merge "Colombo - Kandy Express" → "Colombo - Kandy" (CK-01)

### Part 3: Enhance Route Dictionary UI

Update `RouteManagement.tsx` to:
1. **Group view**: Routes with the same `route_group` are displayed together under a corridor header with a collapsible section
2. **Add route_group field** to the Add/Edit dialog so new routes can be assigned to an existing corridor
3. **Auto-suggest grouping**: When adding a route, if start/end locations match an existing route's end/start, suggest linking them as a corridor
4. **Corridor summary row**: Shows total buses, combined distance (round-trip), and both directions at a glance

### Part 4: Fix "Colombo to Passara" bad data

Route "Colombo to Passara" (8/1/99) has `start_location = "Colombo to Passara"` and `end_location = "Unknown"`. Fix to: `start_location = "Colombo"`, `end_location = "Passara"`.

## Files to Change

- **New SQL migration** — add `route_group` column, set groups for known corridors, merge true duplicates, fix bad data
- **`src/pages/RouteManagement.tsx`** — add corridor grouping view, route_group field in add/edit dialog, auto-suggest grouping

## Result

- Duplicate routes cleaned up (33 → ~29 routes)
- Related routes (forward/return) visually grouped under corridors
- Route Dictionary becomes the single source of truth for all route management
- Add/Edit dialog includes corridor assignment
- Cleaner, more organized route list

