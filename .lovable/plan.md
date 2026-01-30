
# NCG Express Finance Integration - Phase 5 Implementation Plan

## Overview

This plan completes the NCG Express Finance Integration by adding GL posting UI elements, status indicators, bulk posting dialogs, and auto-posting integration to the Daily Trips and Daily Bus Expenses pages.

---

## Current State

| Component | Status |
|-----------|--------|
| `ncg_express_finance_settings` table | Created |
| `journal_entry_id` / `gl_posted` columns on daily_trips | Created |
| `journal_entry_id` / `gl_posted` columns on daily_bus_expenses | Created |
| `useNCGExpressFinance.ts` hook | Created |
| `NCGExpressFinanceSettings.tsx` component | Created |
| Settings tab in Settings.tsx | Added |
| **GL Status badges on pages** | **PENDING** |
| **Post to GL buttons** | **PENDING** |
| **Bulk posting dialogs** | **PENDING** |
| **Auto-posting on save** | **PENDING** |

---

## Implementation Details

### 1. Create GL Status Badge Component

**New File**: `src/components/ncg-express/GLStatusBadge.tsx`

A reusable badge component that shows:
- "Posted" (green) when `gl_posted = true`
- "Unposted" (orange) when `gl_posted = false` or null
- Optional link to view the journal entry

```text
Props:
- glPosted: boolean | null
- journalEntryId?: string
- size?: 'sm' | 'default'
```

---

### 2. Create Bulk GL Posting Dialog Component

**New File**: `src/components/ncg-express/BulkGLPostingDialog.tsx`

A modal dialog for batch posting unposted trips/expenses:

```text
Features:
- Date range picker
- Type selector (Trips / Expenses / Both)
- Preview of unposted records count
- Progress indicator during posting
- Success/failure summary

Props:
- open: boolean
- onOpenChange: (open: boolean) => void
- type: 'trips' | 'expenses' | 'both'
- onComplete: () => void
```

---

### 3. Update Daily Trips Page

**File**: `src/pages/DailyTrips.tsx`

**Changes**:
1. Add "Post to GL" button in header actions (next to Export GL button)
2. Add filter toggle: "Show only unposted trips"
3. Import and use `BulkGLPostingDialog`

**New Header Button**:
```text
<Button variant="outline" onClick={() => setShowBulkPostingDialog(true)}>
  <BookOpen className="mr-2 h-4 w-4" />
  Post to GL
</Button>
```

---

### 4. Update BusDailySummaryTable Component

**File**: `src/components/trips/BusDailySummaryTable.tsx`

**Changes**:
1. Fetch `gl_posted` status from trip data
2. Add GL Status badge column in the summary row
3. Add "Post to GL" action in the dropdown menu for unposted trips
4. Show aggregated GL status (e.g., "2/5 trips posted")

**New Imports**:
```text
import { GLStatusBadge } from "@/components/ncg-express/GLStatusBadge";
import { useNCGExpressFinanceSettings, postTripRevenueToGL } from "@/hooks/useNCGExpressFinance";
```

**Badge Display**:
```text
In the summary row, add:
- Badge showing "X/Y Posted" or "All Posted" 
- If any unposted, show orange badge
- Dropdown menu item: "Post All Trips to GL"
```

---

### 5. Update Daily Bus Expenses Page

**File**: `src/pages/DailyBusExpenses.tsx`

**Changes**:
1. Add "Post Expenses to GL" button in header
2. Add GL Status badge next to each expense card's total
3. Add individual "Post to GL" action button for unposted expenses
4. Add bulk posting dialog for expenses

**Header Addition**:
```text
<Button 
  variant="outline" 
  onClick={() => setShowExpensePostingDialog(true)}
>
  <Receipt className="mr-2 h-4 w-4" />
  Post to GL
</Button>
```

**Card Modification**:
In each expense card header, add GL status badge:
```text
<div className="flex items-center gap-3">
  <GLStatusBadge 
    glPosted={expense.gl_posted} 
    journalEntryId={expense.journal_entry_id} 
  />
  <div className="text-right">...</div>
</div>
```

---

### 6. Update ExpensesTableView Component

**File**: `src/components/trips/ExpensesTableView.tsx`

**Changes**:
1. Add "GL Status" column showing Posted/Unposted badge
2. Add "Post to GL" action button for unposted expenses
3. Update the query to include `gl_posted` and `journal_entry_id` fields

**New Column**:
```text
{
  id: "gl_status",
  header: "GL Status",
  cell: ({ row }) => (
    <GLStatusBadge 
      glPosted={row.original.gl_posted} 
      journalEntryId={row.original.journal_entry_id}
    />
  ),
}
```

---

### 7. Integrate Auto-Posting on Save

**File**: `src/hooks/useDailyBusExpenses.ts`

**Changes**:
1. Import NCG Express finance functions
2. After successful save, check if `auto_post_expenses = true`
3. If enabled, automatically call `postExpensesToGL`
4. Show appropriate toast messages

**Modified saveExpense function**:
```text
const saveExpense = async (expense: DailyBusExpense) => {
  // ... existing save logic ...
  
  // After successful save, check auto-posting
  if (result && settings?.auto_post_expenses) {
    const glResult = await postExpensesToGL(savedExpense, settings);
    if (glResult.success) {
      toast({ title: "Success", description: "Expenses saved and posted to GL" });
    }
  }
  
  return result;
};
```

---

### 8. Update useDailyBusGroupedTrips Hook

**File**: `src/hooks/useDailyBusGroupedTrips.ts`

**Changes**:
1. Add `gl_posted` and `journal_entry_id` to the trips query select statement
2. Add these fields to the Trip interface
3. Include in the grouped data passed to components

**Interface Update**:
```text
export interface Trip {
  // ... existing fields ...
  gl_posted?: boolean;
  journal_entry_id?: string;
}
```

**Query Update**:
```text
.select(`
  id,
  trip_no,
  trip_date,
  bus_id,
  route_id,
  income,
  income_details,
  distance_km,
  odometer_start,
  odometer_end,
  start_time,
  end_time,
  notes,
  gl_posted,
  journal_entry_id,
  buses:bus_id(bus_no),
  routes:route_id(route_name, route_no, gl_code)
`)
```

---

## File Summary

### New Files (2)
| File | Purpose |
|------|---------|
| `src/components/ncg-express/GLStatusBadge.tsx` | Reusable GL status indicator badge |
| `src/components/ncg-express/BulkGLPostingDialog.tsx` | Dialog for batch posting trips/expenses to GL |

### Files to Modify (6)
| File | Changes |
|------|---------|
| `src/pages/DailyTrips.tsx` | Add Post to GL button, bulk posting dialog |
| `src/pages/DailyBusExpenses.tsx` | Add GL status badges, Post to GL button, dialog |
| `src/components/trips/BusDailySummaryTable.tsx` | Add GL status badges, individual posting actions |
| `src/components/trips/ExpensesTableView.tsx` | Add GL Status column, posting action |
| `src/hooks/useDailyBusExpenses.ts` | Integrate auto-posting on save |
| `src/hooks/useDailyBusGroupedTrips.ts` | Include gl_posted/journal_entry_id in query |

---

## Implementation Order

1. **Create GLStatusBadge** - Reusable component first
2. **Update hooks** - Add gl_posted fields to queries
3. **Create BulkGLPostingDialog** - Main batch posting interface
4. **Update DailyBusExpenses page** - Add badges and buttons
5. **Update ExpensesTableView** - Add GL column
6. **Update BusDailySummaryTable** - Add trip GL status
7. **Update DailyTrips page** - Add header button and dialog
8. **Integrate auto-posting** - Connect to save operations

---

## Expected UI Result

### Daily Trips Page
- New "Post to GL" button in header
- Each bus row shows: "3/5 Posted" badge or "All Posted"
- Dropdown menu includes "Post All Trips to GL" action
- Bulk posting dialog with date range and progress

### Daily Bus Expenses Page  
- New "Post to GL" button in header
- Each expense card shows GL Status badge (Posted/Unposted)
- Table view includes GL Status column
- Bulk posting dialog for expenses

### Auto-Posting Behavior
- When enabled in settings and expense is saved, automatically posts to GL
- Shows combined success message: "Expenses saved and posted to GL"
- If GL posting fails, expense is still saved but status shows "Unposted"
