

# Plan: Show All Excel-Imported Fields in Bus Master Data Sheet + Improve Import Header Matching

## What's Missing

The Master Data Sheet overview currently shows only 8 bus fields and 3 owner fields. After the Excel import populates the new columns, these fields are **not displayed**:

| Excel Column | DB Column | Currently Shown? |
|---|---|---|
| Vehicle Name | `vehicle_name` | No |
| Vehicle Brand | `vehicle_brand` | No |
| Permit No | `permit_no` | No |
| Permit Category | `permit_category` | No |
| Permit Expiry Date | `permit_expiry_date` | No |
| Leasing Bank | `leasing_bank` | No |
| Leasing End Date | `leasing_end_date` | No |
| Insurance Company | `insurance_company` | No |
| Default Driver | `default_driver_name` | No |
| Driver Phone | `driver_phone` | No |
| Revenue License Expiry | `revenue_license_expiry` | Shows status only, no date detail |
| Insurance Expiry | `insurance_expiry` | Shows status only, no date detail |

The `useBusMasterData` hook already fetches `SELECT *` from buses — so all data is available, just not rendered.

## What I'll Do

### 1. Expand Bus Master Overview Tab

Update `BusMasterOverviewTab.tsx` to show ALL fields in organized sections:

**Bus Information card** (expand from 8 to 12 fields):
- Add: Vehicle Name, Vehicle Brand, Permit No, Permit Category

**Owner Information card** (keep existing 3 fields)

**New: Permit & Licensing card**:
- Permit No, Permit Category, Permit Expiry Date, Revenue License Expiry (with date + status)

**New: Leasing & Finance card**:
- Leasing Bank, Leasing End Date

**New: Driver Information card**:
- Default Driver Name, Driver Phone

**Document Status card** (enhance):
- Show Insurance Company name alongside the insurance expiry status

### 2. Expand Excel Import Header Synonyms

Add more fuzzy synonyms to handle variations in Excel column names:

- "vehicle no" → also match "veh no", "v.no", "bus reg", "registration number"
- "chassie no" → also match "chasis no", "chasi no" (common misspellings)
- "insurence" → also match "insurance" (fix both spellings)
- "yom" → also match "manufacture year", "mfg year"
- "ownership" → also match "owner's name"
- Add "documents" synonym group for any document-related columns

### 3. Import Preview Enhancement

In the import preview table, show which fields will be populated with a clearer field-by-field diff (currently just shows count of fields to update).

## Files
- **Modify**: `src/components/fleet/BusMasterOverviewTab.tsx` — add all new field sections
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx` — expand header synonyms, improve preview

## Result
After importing the Excel sheet, opening any bus's Master Data Sheet will show all fields populated: permits, leasing, insurance company, driver info — everything from the operations Excel.

