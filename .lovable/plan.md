
# Fix Staff Performance Page Issues

## Problems Identified

1. **Eye Icon (View Details) Not Working**: The Dialog component in the actions column uses `DialogTrigger asChild` with a Button that has `onClick`. This can cause event handling conflicts where the click is captured but the dialog doesn't properly open.

2. **Filter for Drivers/Conductors Only**: While the database only contains 'driver' and 'conductor' types, the hook should explicitly filter for these to be defensive against future data changes.

3. **Missing Details in Staff View**: Several fields from staff_registry are not displayed:
   - Emergency Contact
   - Staff Notes
   - Account Created Date
   - Last Updated Date

## Solution

### 1. Fix Eye Icon Dialog - Use Controlled Dialog State

Change from uncontrolled to controlled Dialog to ensure proper opening:

**Current (Broken):**
```jsx
<Dialog>
  <DialogTrigger asChild>
    <Button onClick={() => handleStaffClick(row.original)}>
      <Eye />
    </Button>
  </DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

**Fixed (Controlled):**
```jsx
<Dialog 
  open={openDialogId === row.original.id} 
  onOpenChange={(open) => {
    if (open) {
      setOpenDialogId(row.original.id);
      handleStaffClick(row.original);
    } else {
      setOpenDialogId(null);
    }
  }}
>
  <DialogTrigger asChild>
    <Button variant="ghost" size="sm">
      <Eye />
    </Button>
  </DialogTrigger>
  <DialogContent>...</DialogContent>
</Dialog>
```

### 2. Filter Staff Types in Hook

Add explicit filter in `useStaffPerformance.ts`:

```typescript
const { data: staffRegistry, error: staffError } = await supabase
  .from('staff_registry')
  .select('*')
  .in('staff_type', ['driver', 'conductor'])  // Only fetch drivers and conductors
  .order('staff_name');
```

### 3. Add Missing Details to StaffDetailContent

Update the Personal Information section to include:

| Field | Display |
|-------|---------|
| Emergency Contact | Phone number for emergencies |
| Notes | Staff notes/comments |
| Member Since | Account creation date |
| Last Updated | Last profile update |

### 4. Update Interface and Data Flow

Add new fields to `StaffMemberPerformance` interface:
- `emergency_contact?: string`
- `notes?: string`
- `created_at?: string`
- `updated_at?: string`

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/StaffPerformance.tsx` | Add controlled dialog state, update eye icon column, enhance StaffDetailContent |
| `src/hooks/useStaffPerformance.ts` | Add staff_type filter, include emergency_contact, notes, created_at, updated_at |

## UI Preview for Enhanced Details Section

```
Personal Information:
┌────────────────────────────────────────────────────┐
│ Phone:        +94 77 123 4567                      │
│ NIC:          199012345678V                        │
│ Address:      123 Main Street, Colombo             │
│ Emergency:    +94 77 987 6543                      │
├────────────────────────────────────────────────────┤
│ Salary Type:  [Monthly]                            │
│ Daily Rate:   LKR 2,500                            │
│ Monthly:      LKR 65,000                           │
├────────────────────────────────────────────────────┤
│ Notes:        Experienced highway driver           │
│ Member Since: Jan 15, 2024                         │
│ Last Updated: Feb 01, 2026                         │
└────────────────────────────────────────────────────┘
```

## Expected Outcome

1. Clicking the eye icon will properly open the staff details dialog
2. Only drivers and conductors will appear in the list
3. All available staff information will be displayed in the details view
4. Summary stats will accurately reflect only driver/conductor counts
