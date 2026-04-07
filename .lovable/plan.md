

# Add Missing Fields to Public Complaint Form (Match Google Form)

## Problem
The public complaint form (`/public/complaint`) is missing key fields that exist in the NCG Express Google Form. Currently it only has: Name, Phone, Email, Subject, Category, Priority, Description. The Google Form has additional transport-specific fields needed for proper complaint handling.

## Fields to Add

| Field | Type | Required | Google Form Match |
|-------|------|----------|-------------------|
| Route Number | Text input | No | Yes (Page 2) |
| Bus Number | Text input | No | Yes (Page 2) |
| Date of Incident | Date picker | No | Yes (Page 2) |
| Time of Incident | Time input | No | Yes (Page 2) |
| Location / Stop | Text input | No | Yes (Page 2) |
| Driver Name (if known) | Text input | No | Yes (Page 2) |

## Storage Approach
The `feedback_complaints` table already has a `related_persons` JSON column and `description` text field. We will:
- Store the new structured fields in `related_persons` as JSON: `{ route_number, bus_number, incident_date, incident_time, location, driver_name, customer_name, customer_phone, customer_email }`
- Keep the description field for the detailed complaint text
- This avoids needing a DB migration

## Plan

### 1. Update `PublicComplaintForm.tsx`
- Add new state fields: `routeNumber`, `busNumber`, `incidentDate`, `incidentTime`, `location`, `driverName`
- Add a new "Incident Details" section between Contact Info and Complaint Details with these 6 fields in a grid layout
- Store all structured data in `related_persons` JSON on insert instead of appending to description text
- Make Contact No required (matching Google Form's required `*` marker)

### 2. Update validation schema (`src/lib/validation.ts`)
- Add optional validation for the new fields (max lengths, date format)
- Make `customerPhone` required (matches Google Form)

## Files
- **Modify**: `src/components/complaints/PublicComplaintForm.tsx` — add incident detail fields, store in `related_persons` JSON
- **Modify**: `src/lib/validation.ts` — add validation for new fields, make phone required

