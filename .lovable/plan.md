

# Fix Two Issues: Per-Trip Route Independence + Complaint Details View

## Issue 1: Route Change Cascading to All Trips

**Problem**: In daily mode, when you change the route on trip sequence 1 (the first trip), it updates the master roster's `route_label` which cascades to ALL trips for that bus. Only `trip_sequence > 1` uses the per-trip `route_label__trip:` update path.

**Root cause** (line 302-305 in `FleetMasterSpreadsheetCore.tsx`):
```
if (editMode === 'daily' && row.trip_id && row.trip_sequence > 1) {
  onUpdate(row.id, `route_label__trip:${row.trip_id}`, currentValue);
} else {
  onUpdate(row.id, 'route_label', currentValue);  // <-- THIS updates master roster for ALL trips
}
```

**Fix**: In daily mode, ALL trip sequences (including sequence 1) should use the per-trip update path when a `trip_id` exists. Only fall back to roster update when no trip has been created yet.

### File: `src/components/fleet/FleetMasterSpreadsheetCore.tsx`
- Change the route select `onSelect` handler (line 302): use `route_label__trip:` for ALL sequences in daily mode when `trip_id` exists, not just `> 1`

### File: `src/hooks/useFleetMasterSpreadsheet.ts`
- The `route_label__trip:` handler already correctly updates the specific `daily_trips` row -- no change needed here

---

## Issue 2: Complaint Management Page Missing Details

**Problem**: The public complaint form collects bus number, route number, customer phone, customer name, incident date/time, location, driver name -- all stored in `related_persons` JSON. But the complaints table and detail view dialog don't show any of these fields. Management team can't see critical incident info.

**Fix**: Redesign the complaints page to show all form details prominently.

### File: `src/pages/Complaints.tsx`

**Table columns** -- Add new columns visible in the data table:
- Bus Number (from `related_persons.bus_number`)
- Route Number (from `related_persons.route_number`)  
- Customer Phone (from `related_persons.customer_phone`)
- Location (from `related_persons.location`)

**Detail view dialog** (the "View" button dialog, lines 1114-1206) -- Complete redesign:
- Add a prominent incident info section showing: Bus Number, Route Number, Date & Time, Location, Driver Name
- Add customer info section: Customer Name, Phone, Email
- Use a card-based layout with icons and color-coded sections
- Show priority and status as large colored badges
- Add a timeline showing created date, escalation, resolution
- Make it visually attractive for the management team with proper spacing and visual hierarchy

**Manage dialog** -- Add a read-only "Incident Summary" tab showing all the `related_persons` data so managers can see full context while managing

## Result
- Changing route on any trip (including trip 1) in daily mode only affects that specific trip
- Complaint management page shows bus number, route, customer phone, location in the table
- Detail view shows ALL form fields in an attractive, organized layout for management review

