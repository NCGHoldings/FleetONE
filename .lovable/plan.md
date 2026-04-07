

# Fix: SLA Display Shows "6d left" Instead of "2d left"

## Root Cause

The database `calculate_sla_due_date` function correctly computes the SLA due date as **2 working days** (48 business hours), skipping weekends and Sri Lankan holidays. The holidays table exists and is populated.

The bug is in the **frontend display** (`Complaints.tsx` line 163):
```
const daysDiff = Math.ceil(hoursDiff / 8);  // 48 hours / 8 = 6 days — WRONG
```
It divides remaining calendar hours by 8 (assuming 8-hour workdays), inflating the count by 3x.

## Fix

### Modify `src/pages/Complaints.tsx` — `calculateSLA` function

Replace the naive `hoursDiff / 8` calculation with a proper **working days counter** that:
1. Counts calendar days between now and the SLA due date
2. Skips Saturdays (DOW=6) and Sundays (DOW=0)
3. Returns working days remaining (e.g., Monday to Wednesday = 2 working days)

For holidays: since the due date was already computed by the DB skipping holidays, the working-day count on the frontend only needs to skip weekends to be accurate. The due date itself already accounts for holidays.

```typescript
const calculateSLA = (complaint: Complaint) => {
  if (complaint.status === 'resolved') return <span>Resolved</span>;
  
  const dueDate = complaint.sla_due_date ? new Date(complaint.sla_due_date) : null;
  if (!dueDate) return <span>N/A</span>;
  
  const now = new Date();
  if (dueDate < now) return <span>Overdue</span>;
  
  // Count working days remaining (skip Sat/Sun)
  let workingDays = 0;
  let current = new Date(now);
  current.setHours(0,0,0,0);
  const target = new Date(dueDate);
  target.setHours(0,0,0,0);
  
  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
  }
  
  if (workingDays === 0) {
    // Same day — show hours
    const hoursLeft = Math.floor((dueDate.getTime() - now.getTime()) / 3600000);
    return <span>{hoursLeft}h left</span>;
  }
  return <span>{workingDays}d left</span>;
};
```

## Result
- A complaint created on Monday will show **"2d left"** (not "6d left")
- Weekends are not counted in the remaining days display
- "Overdue" still shows correctly for past-due complaints
- Hours display for same-day deadlines remains

## Files
- **Modify**: `src/pages/Complaints.tsx` — fix `calculateSLA` working days calculation

