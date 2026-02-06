
# Complete NCG Express Finance Integration: Bus/Route P&L Reports

## Overview

This implementation completes the NCG Express finance integration by:
1. Updating GL posting to include bus_id/route_id metadata in journal entry lines
2. Enhancing the DrillDownModal with bus/route filters
3. Creating Bus-wise P&L Report
4. Creating Route-wise P&L Report

The database already has the required columns (`bus_id`, `route_id`, `trip_id`, `expense_id`) in `journal_entry_lines` - we just need to populate them during GL posting.

---

## Part 1: Update NCG Express GL Posting

### File: `src/hooks/useNCGExpressFinance.ts`

Update both `postTripRevenueToGL` and `postExpensesToGL` functions to include bus_id and route_id in journal entry lines.

**Current State (lines 215-232):**
```typescript
const lines = [
  {
    journal_entry_id: journalEntry.id,
    account_id: settings.cash_account_id,
    debit: trip.income,
    credit: 0,
    description: `Cash from trip - ${routeName}`,
    company_id: NCG_EXPRESS_COMPANY_ID,
  },
  // ...
];
```

**Updated State:**
```typescript
const lines = [
  {
    journal_entry_id: journalEntry.id,
    account_id: settings.cash_account_id,
    debit: trip.income,
    credit: 0,
    description: `Cash from trip - ${routeName}`,
    company_id: NCG_EXPRESS_COMPANY_ID,
    bus_id: trip.bus_id || null,        // NEW
    route_id: trip.route_id || null,    // NEW
    trip_id: trip.id,                    // NEW
  },
  // ...
];
```

Similarly update expense posting to include `bus_id` and `expense_id` in journal lines.

---

## Part 2: Enhance DrillDownModal with Bus/Route Filters

### File: `src/components/accounting/DrillDownModal.tsx`

Add new filter dropdowns for Bus and Route selection.

**Changes:**
1. Add state for `busFilter` and `routeFilter`
2. Fetch buses and routes lists
3. Add filter dropdowns in the filter bar
4. Update query to filter by bus_id/route_id when selected
5. Add Bus/Route columns to the table display
6. Include in CSV export

**New Query Structure:**
```typescript
let query = supabase
  .from("journal_entry_lines")
  .select(`
    id, debit, credit, description, created_at,
    bus_id, route_id, trip_id, expense_id,
    buses:bus_id(bus_no),
    routes:route_id(route_name),
    journal_entries!inner(...)
  `)
  .eq("account_id", accountId);

// Apply bus filter
if (busFilter && busFilter !== "_all") {
  query = query.eq("bus_id", busFilter);
}

// Apply route filter
if (routeFilter && routeFilter !== "_all") {
  query = query.eq("route_id", routeFilter);
}
```

---

## Part 3: Bus-wise P&L Report

### New File: `src/components/ncg-express/BusProfitabilityReport.tsx`

A comprehensive report showing profitability per bus.

**Features:**
- Date range selector
- KPI cards: Total Revenue, Total Expenses, Net Profit, Profit Margin
- Bar chart comparing bus profitability
- Detailed table with sortable columns
- Export to CSV/PDF

**Data Structure:**
```typescript
interface BusProfitability {
  busId: string;
  busNo: string;
  category: string;
  totalRevenue: number;
  totalExpenses: number;
  fuelCost: number;
  maintenanceCost: number;
  salaryCost: number;
  otherCosts: number;
  netProfit: number;
  profitMargin: number;
  tripCount: number;
  totalKm: number;
  profitPerKm: number;
}
```

**Query Approach:**
```typescript
// Aggregate revenue from daily_trips
const { data: revenueData } = await supabase
  .from('daily_trips')
  .select('bus_id, income, km_run, buses(bus_no, category)')
  .gte('trip_date', startDate)
  .lte('trip_date', endDate);

// Aggregate expenses from daily_bus_expenses
const { data: expenseData } = await supabase
  .from('daily_bus_expenses')
  .select('bus_id, fuel_cost, repair, salary, ..., buses(bus_no)')
  .gte('expense_date', startDate)
  .lte('expense_date', endDate);
```

---

## Part 4: Route-wise P&L Report

### New File: `src/components/ncg-express/RouteProfitabilityReport.tsx`

A report showing profitability per route.

**Features:**
- Date range selector
- KPI cards: Best Route, Worst Route, Average Revenue/Trip
- Line chart showing revenue trend by route
- Detailed table with cost allocation
- Export capabilities

**Data Structure:**
```typescript
interface RouteProfitability {
  routeId: string;
  routeName: string;
  totalRevenue: number;
  allocatedExpenses: number;
  tripCount: number;
  averageRevenuePerTrip: number;
  totalKm: number;
  revenuePerKm: number;
  estimatedProfit: number;
  profitMargin: number;
}
```

**Expense Allocation Logic:**
Since expenses are tracked at bus level, we'll allocate expenses to routes proportionally based on trip count or KM:
```typescript
// Calculate expense allocation per bus
const busExpenseMap = new Map();
expenseData.forEach(exp => {
  busExpenseMap.set(exp.bus_id, calculateTotalExpense(exp));
});

// Allocate to routes based on trips
routeTripData.forEach(route => {
  const busTrips = route.trips;
  busTrips.forEach(trip => {
    const busExpense = busExpenseMap.get(trip.bus_id);
    const allocationRatio = 1 / busTripsCount[trip.bus_id];
    route.allocatedExpense += busExpense * allocationRatio;
  });
});
```

---

## Part 5: Hook for Profitability Data

### New File: `src/hooks/useNCGExpressProfitability.ts`

A dedicated hook for fetching profitability data.

```typescript
export function useBusProfitability(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['ncge-bus-profitability', startDate, endDate],
    queryFn: async () => {
      // Fetch and aggregate data
    }
  });
}

export function useRouteProfitability(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['ncge-route-profitability', startDate, endDate],
    queryFn: async () => {
      // Fetch and aggregate data
    }
  });
}
```

---

## Part 6: Integration into NCG Express Module

### Update NCG Express Navigation

Add the new reports to the NCG Express section of the application.

**Location:** Add tabs/buttons in the Daily Trips or a dedicated NCG Express Finance Reports page.

```typescript
<Tabs defaultValue="trips">
  <TabsList>
    <TabsTrigger value="trips">Daily Trips</TabsTrigger>
    <TabsTrigger value="expenses">Expenses</TabsTrigger>
    <TabsTrigger value="bus-pl">Bus P&L</TabsTrigger>
    <TabsTrigger value="route-pl">Route P&L</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## Implementation Sequence

| Step | Task | File(s) |
|------|------|---------|
| 1 | Update GL posting with bus_id/route_id | `useNCGExpressFinance.ts` |
| 2 | Create profitability data hook | `useNCGExpressProfitability.ts` (new) |
| 3 | Enhance DrillDownModal with filters | `DrillDownModal.tsx` |
| 4 | Create Bus P&L Report | `BusProfitabilityReport.tsx` (new) |
| 5 | Create Route P&L Report | `RouteProfitabilityReport.tsx` (new) |
| 6 | Integrate into navigation | `DailyTrips.tsx` or new page |

---

## Visual Preview

### Bus P&L Report Layout
```
+------------------------------------------------------------------+
|  NCG EXPRESS - BUS PROFITABILITY REPORT                          |
+------------------------------------------------------------------+
|  [Date Range: Jan 1 - Jan 31, 2026]  [Export CSV] [Export PDF]   |
+------------------------------------------------------------------+

+---------------+  +---------------+  +---------------+  +---------------+
| TOTAL REVENUE |  | TOTAL EXPENSE |  | NET PROFIT    |  | AVG MARGIN    |
| Rs 4,500,000  |  | Rs 3,200,000  |  | Rs 1,300,000  |  | 28.9%         |
+---------------+  +---------------+  +---------------+  +---------------+

[=============== BAR CHART: Profit by Bus ================]

+-------+----------+------------+------------+-----------+--------+
| BUS   | REVENUE  | EXPENSES   | PROFIT     | MARGIN    | TRIPS  |
+-------+----------+------------+------------+-----------+--------+
| NC-01 | 450,000  | 320,000    | 130,000    | 28.9%     | 45     |
| NC-02 | 380,000  | 290,000    | 90,000     | 23.7%     | 38     |
| NC-03 | 520,000  | 400,000    | 120,000    | 23.1%     | 52     |
+-------+----------+------------+------------+-----------+--------+
```

### Route P&L Report Layout
```
+------------------------------------------------------------------+
|  NCG EXPRESS - ROUTE PROFITABILITY REPORT                        |
+------------------------------------------------------------------+

+---------------+  +---------------+  +---------------+  +---------------+
| BEST ROUTE    |  | WORST ROUTE   |  | AVG REV/TRIP  |  | TOTAL ROUTES  |
| CMB-KDY       |  | CMB-ANU       |  | Rs 12,500     |  | 15            |
| Rs 850,000    |  | Rs 120,000    |  |               |  |               |
+---------------+  +---------------+  +---------------+  +---------------+

[============= LINE CHART: Revenue Trend by Route ==============]

+------------+----------+-------------+-------+-----------+--------+
| ROUTE      | REVENUE  | ALLOC. EXP  | TRIPS | REV/TRIP  | MARGIN |
+------------+----------+-------------+-------+-----------+--------+
| CMB-KDY    | 850,000  | 580,000     | 70    | 12,143    | 31.8%  |
| CMB-GLI    | 620,000  | 450,000     | 55    | 11,273    | 27.4%  |
| CMB-ANU    | 120,000  | 95,000      | 12    | 10,000    | 20.8%  |
+------------+----------+-------------+-------+-----------+--------+
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useNCGExpressProfitability.ts` | Data fetching hooks for bus/route P&L |
| `src/components/ncg-express/BusProfitabilityReport.tsx` | Bus-wise P&L report UI |
| `src/components/ncg-express/RouteProfitabilityReport.tsx` | Route-wise P&L report UI |

### Updated Files
| File | Changes |
|------|---------|
| `src/hooks/useNCGExpressFinance.ts` | Add bus_id/route_id to journal lines |
| `src/components/accounting/DrillDownModal.tsx` | Add bus/route filter dropdowns |
| `src/pages/DailyTrips.tsx` | Add tabs for P&L reports |

---

## Expected Outcome

After implementation:
1. All NCG Express GL postings will include bus and route metadata
2. Finance team can filter ledger drill-downs by specific buses or routes
3. Management can view bus-wise profitability to identify high/low performers
4. Route profitability analysis enables data-driven route optimization
5. All reports exportable to CSV/PDF for external sharing
