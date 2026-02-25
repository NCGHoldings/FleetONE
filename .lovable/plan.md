

# Driver & Conductor Master Profiles Page

## Overview

Transform the Staff Performance page into a **Driver & Conductor Master Profiles** page. Remove the insights panel, make the table full-width, add Excel import with template download, add document upload (NIC, Licence, etc.), and add new profile fields to the database.

---

## Database Changes

Add new columns to `staff_registry` table for complete driver/conductor profiles:

- `license_number` (text, nullable) -- Driving license number
- `license_expiry` (date, nullable) -- License expiry date
- `date_of_birth` (date, nullable) -- DOB
- `blood_group` (text, nullable) -- Blood group
- `joined_date` (date, nullable) -- Date joined company
- `license_type` (text, nullable) -- License category (e.g., Heavy, Light)

These fields will make the profiles comprehensive for drivers and conductors.

---

## Changes

### 1. Page Layout (src/pages/StaffPerformance.tsx)

- **Remove** the `PerformanceInsightsPanel` (right sidebar) entirely
- Change layout from `grid lg:grid-cols-3` (2+1 columns) to full-width single column
- Update page title from "Staff Performance" to "Driver & Conductor Profiles"
- Update subtitle text accordingly
- Remove the "Staff Type" filter dropdown since only drivers and conductors exist (but keep a filter for driver vs conductor)
- Add **Import from Excel** button and **Download Template** button in the header area
- Add **Document Upload** section in the staff detail dialog (new tab "Documents")

### 2. Excel Import Feature

Create a new component `src/components/staff/StaffExcelImport.tsx`:

- **Download Template** button: Generates an XLSX file with columns:
  - Staff Name, Staff Type (driver/conductor), Contact Number, NIC Number, Address, Emergency Contact, License Number, License Expiry, Date of Birth, Blood Group, License Type, Joined Date, Salary Type (daily/monthly), Daily Rate, Monthly Salary, Notes
- **Upload Excel** button: Opens a dialog to upload an Excel file
  - Parse using `xlsx` library (already installed)
  - Validate rows (required: staff_name, staff_type)
  - Show validation summary (valid/errors)
  - Merge mode: Match by NIC number or staff name, update existing or insert new
  - Show progress and results toast

### 3. Document Upload for Staff

Reuse the existing `DocumentUpload` component (`src/components/documents/DocumentUpload.tsx`):
- Pass `linkedTable="staff_registry"` and `linkedRowId={staff.id}`
- Add a new "Documents" tab in the `StaffDetailContent` dialog
- Update `TAG_OPTIONS` or create staff-specific tags: NIC Copy, Driving License, Medical Certificate, Police Clearance, Agreement, Training Certificate, Photo, Other

### 4. Hook Changes (src/hooks/useStaffPerformance.ts)

- Update the select query to include new columns (`license_number`, `license_expiry`, `date_of_birth`, `blood_group`, `joined_date`, `license_type`)
- Map these to the `StaffMemberPerformance` interface (add new fields)

### 5. Table Columns Update

Update the columns in the DataTable:
- Keep: Staff Member (name + type), Phone, NIC, Performance score, Trips/KM, Attendance, Rating, Actions
- Add: License Number, Joined Date columns
- The detail dialog remains for full profile view

---

## Technical Details

### Database Migration SQL

```sql
ALTER TABLE public.staff_registry
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS joined_date date,
  ADD COLUMN IF NOT EXISTS license_type text;
```

### Excel Template Columns

| Staff Name | Staff Type | Contact Number | NIC Number | Address | Emergency Contact | License Number | License Expiry | Date of Birth | Blood Group | License Type | Joined Date | Salary Type | Daily Rate | Monthly Salary | Notes |

### File Structure

```text
src/
  pages/
    StaffPerformance.tsx          -- Updated: full-width layout, new buttons, documents tab
  components/
    staff/
      StaffExcelImport.tsx        -- NEW: Excel import dialog + template download
  hooks/
    useStaffPerformance.ts        -- Updated: new fields in interface and query
```

### Import Flow

```text
1. User clicks "Download Template" --> gets pre-formatted XLSX
2. User fills in driver/conductor data
3. User clicks "Import from Excel" --> upload dialog
4. System parses XLSX, validates rows
5. Shows validation report (valid/warning/error counts)
6. User confirms --> system upserts to staff_registry (match by NIC or name)
7. Success toast with counts
```

### Document Upload Integration

The existing `DocumentUpload` component already supports any `linkedTable` + `linkedRowId`. Adding it to the staff detail dialog just requires:
- A 5th tab "Documents" in `StaffDetailContent`
- Rendering `<DocumentUpload linkedTable="staff_registry" linkedRowId={staff.id} title="Staff Documents" />`

