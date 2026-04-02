

# Add Sidebar Search to Find Modules Quickly

## What to build
A search input at the top of the sidebar (below the logo, above the menu groups) that filters all sidebar menu items in real-time as you type. Matching items show in a flat list; when the search is cleared, the normal grouped layout returns.

## Implementation

### File: `src/components/layout/AppSidebar.tsx`

1. Add a `searchQuery` state variable
2. Insert a search `Input` with a `Search` icon below the `SidebarHeader` (inside `SidebarContent`, before the groups) — hidden when sidebar is collapsed
3. Create a helper that collects ALL menu items from all groups (mainItems, operationsItems, businessItems, financeItems, yutongItems, sinotruckItems, lightVehicleItems, nspItems, governanceItems, marketingItems) into one flat array with their group label
4. When `searchQuery` is non-empty:
   - Filter all items by title match (case-insensitive)
   - Render a single flat `SidebarMenu` with matching items (showing group label as subtle text)
   - Apply the same `hasAccess` permission filter
5. When `searchQuery` is empty: render the existing grouped layout unchanged

### UI details
- Small input with `Search` icon and placeholder "Search modules..."
- `X` button to clear search
- Compact styling (`h-8 text-sm`) to fit the sidebar width
- Results show icon + title, clickable as `NavLink` with same styling

### No other files need changes

