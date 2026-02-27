
# Add Employee Search to Staff Directory

## Overview
The Staff Directory table on the Staff Management page (`/auth`) currently has no search functionality. We will enable the built-in search capability of the `DataTable` component by passing `customSearch` and `searchKeys` props, allowing users to search employees by name, employee ID, phone, or role.

## Changes

### Single file modified: `src/pages/StaffManagement.tsx`

1. **Add a `customSearch` function** that filters the `staff` array by matching the search query against `first_name`, `last_name`, `employee_id`, `phone`, and `roles` (case-insensitive partial match).

2. **Pass `customSearch` and `searchKeys` props** to the `<DataTable>` component in the Staff Directory section:
   - `searchKeys={["name", "employee ID", "phone", "role"]}`
   - `customSearch={staffSearch}`

This leverages the existing `EnhancedSearch` component (with 300ms debounce and clear button) that `DataTable` already renders when `customSearch` is provided -- no new components needed.

## Technical Details

The search function:
```typescript
const staffSearch = (data: Profile[], query: string) => {
  const q = query.toLowerCase();
  return data.filter(s =>
    s.first_name?.toLowerCase().includes(q) ||
    s.last_name?.toLowerCase().includes(q) ||
    s.employee_id?.toLowerCase().includes(q) ||
    s.phone?.toLowerCase().includes(q) ||
    s.roles?.some(r => r.toLowerCase().includes(q))
  );
};
```

The DataTable call changes from:
```tsx
<DataTable columns={columns} data={staff} />
```
to:
```tsx
<DataTable
  columns={columns}
  data={staff}
  searchKeys={["name", "employee ID", "phone", "role"]}
  customSearch={staffSearch}
/>
```
