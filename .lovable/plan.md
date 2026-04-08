

# Populate Route Dictionary from Fleet Management Bus Routes

## Problem

The Route Dictionary page currently has only 22 manually-added routes, many of which are duplicates (e.g., "Colombo - Passara" vs "Colombo – Passara" with different dashes). Meanwhile, Fleet Management has **42 distinct routes** assigned to buses (40 public + 2 school bus routes) that are NOT in the Route Dictionary.

The user wants all actual bus routes (both Public Bus and School Bus) to appear in the Route Dictionary as a single source of truth.

## Current State

- **Route Dictionary (`routes` table)**: 22 entries, many duplicates with dash/spelling variations
- **Bus routes (`buses.route` column)**: 42 distinct route strings, also with many duplicates (e.g., "Panadura - Kandy", "Panadura- Kandy", "Panadura-Kandy", "Pnadura - Kandy" are all the same route)

## Implementation

### Step 1: Clean up duplicate routes in Route Dictionary
Delete the clearly duplicate entries that have route names as route numbers (e.g., "Badulla – Makumbura" with route_no = "Badulla – Makumbura") — these are inferior copies of properly numbered routes like route 15.

Routes to delete (duplicates of existing numbered routes):
- "Badulla - Makubura" (dup of route 15)
- "Badulla – Makumbura" (dup of route 15)
- "Makubura - Badulla" (dup of route 15R)
- "Makumbura – Badulla" (dup of route 15R)
- "Colombo - Passara" (dup of route 8/1/99)
- "Colombo – Passara" (dup of route 8/1/99)
- "Passara - Colombo" (dup of route 8/1/99 reverse)
- "Passara – Colombo" (dup of route 8/1/99 reverse)
- "Moratuwa – Jaffna" (dup of route 87)
- "Jaffna – Moratuwa" (dup of route 87R)

### Step 2: Add missing bus routes to Route Dictionary
Insert new route entries for all distinct bus routes from Fleet Management that don't already exist, with proper start/end location parsing. This adds ~25 new canonical routes covering:
- Panadura - Kandy (consolidating 6 spelling variants)
- Colombo - Gampola (consolidating 2 variants)
- Colombo - Jaffna (consolidating 5 variants)
- Nittambuwa routes
- Moratuwa - Kankasanthurei
- And all other unique routes

### Step 3: Add category column to routes table
Add a `category` column (`text`, nullable) to the `routes` table to distinguish "Public Bus" vs "School Bus" routes. This lets the Route Dictionary page filter/display routes by category.

### Step 4: Update Route Dictionary page with category tabs
Add tabs or a filter to the Route Management page showing:
- **All Routes** (default)
- **Public Bus Routes**
- **School Bus Routes**

Display a category badge on each route row.

### Step 5: Add bus count column
Show how many buses are currently assigned to each route, pulling from the `buses` table. This helps identify which routes are active and which are orphaned.

## Files to Change
- New SQL migration — clean duplicates, insert missing routes, add `category` column
- `src/pages/RouteManagement.tsx` — add category filter tabs, bus count column, category badge

## Result
- Route Dictionary becomes the single source of truth with all actual fleet routes
- Public Bus and School Bus routes are clearly labeled and filterable
- Each route shows how many buses are assigned to it
- Duplicate/misspelled route entries are cleaned up

