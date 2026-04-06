

# Add Search Bar to "Add Bus to Fleet Roster" Dialog

## Problem
The bus selection dropdown in the "Add Bus" dialog has no search/filter capability. With many buses in the list, finding the right one is tedious.

## Solution
Replace the plain `Select` with a searchable `Command`-based combobox (Popover + Command pattern already used in shadcn/ui) that lets users type to filter buses by number or route.

### Modify: `src/components/fleet/FleetMasterSpreadsheet.tsx`
- Replace `Select`/`SelectContent`/`SelectItem` with a `Popover` + `Command` (combobox) pattern
- Add a `CommandInput` for search filtering built into the dropdown
- `CommandEmpty` shows "No bus found" when filter yields nothing
- `CommandItem` renders each bus with check icon when selected
- Filter works on both `bus_no` and `route` text

### Components used
- `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- `Command`, `CommandInput`, `CommandEmpty`, `CommandGroup`, `CommandItem` from `@/components/ui/command`
- These are standard shadcn/ui components already in the project

