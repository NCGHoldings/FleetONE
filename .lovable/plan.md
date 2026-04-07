

# Add Advanced Filtering to Fleet Management Page

## What You Get

A collapsible filter panel above the Fleet Overview table with dropdown/multi-select filters for every key dimension. Users can combine filters freely (AND logic) and clear them with one click.

## Filter Dimensions

| Filter | Type | Source |
|--------|------|--------|
| Category | Multi-select badges | `bus_categories` table |
| Sub-Category | Multi-select badges | `bus_sub_categories` (filtered by selected categories) |
| Type (Route) | Multi-select | Distinct `type` values from data (e.g., SBS PANADURA, School Hire, Parked) |
| Model | Multi-select | Distinct `model` values from data |
| Year | Range or multi-select | Distinct `year` values from data |
| Status | Multi-select badges | active / maintenance / idle / retired |
| Route | Multi-select | Distinct `route` values from data |
| Insurance Expiry | Preset buttons | Expired, Expiring (30 days), This Month, Valid |
| License Expiry | Preset buttons | Expired, Expiring (30 days), This Month, Valid |
| Mileage Range | Min/Max inputs | `current_mileage` |
| Running Days | Min/Max inputs | `running_days` |
| Revenue | Min/Max inputs | `avg_daily_revenue` |

## Plan

### 1. Create `FleetFilterPanel` component (`src/components/fleet/FleetFilterPanel.tsx`)

A collapsible card with:
- Toggle button "Filters" with active filter count badge
- Multi-select badge toggles for Category, Status, Type, Model, Year, Route
- Date-based preset buttons for Insurance/License expiry (Expired / Expiring Soon / Valid)
- "Clear All" button
- Returns a filter state object; parent applies client-side filtering

### 2. Extend `FleetManagement.tsx` data fetch to include insurance/license fields

The `fetchFleet` query already uses `select('*')`, so `insurance_expiry` and `revenue_license_expiry` are already in the data. Add these to the `Fleet` interface and expose them for filtering.

### 3. Add filter state and client-side filtering in `FleetManagement.tsx`

- Import `FleetFilterPanel`
- Add filter state (selected categories, statuses, types, models, years, routes, insurance/license presets, mileage/revenue ranges)
- Compute `filteredData` from `data` based on active filters
- Pass `filteredData` to `DataTable` instead of `data`
- Update title to show filtered count vs total: `Fleet Overview (X of Y buses)`
- Fetch `bus_categories` and `bus_sub_categories` on mount for the filter panel

### 4. Upgrade search to multi-key

Replace `searchKey="bus_no"` with `customSearch` that searches across bus_no, type, route, model, and owner_name simultaneously.

## Files
- **New**: `src/components/fleet/FleetFilterPanel.tsx` — the filter UI component
- **Modify**: `src/pages/FleetManagement.tsx` — add filter state, fetch categories, apply filters, upgrade search

