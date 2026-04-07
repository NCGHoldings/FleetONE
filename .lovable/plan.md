

# Add Incident Detail Fields to Internal "Add New Complaint" Dialog

## Problem

The internal "Add New Complaint" dialog in `Complaints.tsx` only has: Type, Title, Category, Priority, Related Staff Group, and Description. It's missing the same incident detail fields (Route Number, Bus Number, Date, Time, Location, Driver Name) that were just added to the public complaint form.

## Plan

### Modify `src/pages/Complaints.tsx`

1. **Extend `formData` state** — add `routeNumber`, `busNumber`, `incidentDate`, `incidentTime`, `location`, `driverName` fields (all default to `''`)

2. **Add "Incident Details" section** to the Add Complaint dialog form (between Staff Group and Description):
   - Route Number (text input)
   - Bus Number (text input)  
   - Date of Incident (date input)
   - Time of Incident (time input)
   - Location / Stop (text input)
   - Driver Name (text input, optional)
   - Laid out in a 2-column grid

3. **Store in `related_persons` JSON** on insert — bundle `routeNumber`, `busNumber`, `incidentDate`, `incidentTime`, `location`, `driverName` into the `related_persons` column (matching the public form's storage pattern)

4. **Also add to Edit dialog** (lines ~776+) so existing complaints can have these fields edited

5. **Reset new fields** when dialog closes

## Files
- **Modify**: `src/pages/Complaints.tsx` — add incident fields to Add and Edit complaint dialogs, store in `related_persons` JSON

