

# School Bus Branch Reports — Excel-Style P&L with Charts

## Current State
The `SchoolBranchReports.tsx` page is a minimal placeholder showing only 4 KPI cards (total students, revenue, payment rate, pending revenue) and a basic payment summary. No charts, no bus-by-bus breakdown, no expense tracking, no profit calculations — nothing like the Excel spreadsheet the user shared.

## What the Excel Shows (Reference: Wattala Branch, January 2026)
A bus-by-bus P&L table with columns per bus (identified by route name + bus reg no):
- **School bus income** (total income per bus)
- **Expense breakdown**: Fuel expenses, Maintenance expenses, Driver salary, Caretaker salary, Parking fee, Other expenses
- **Total direct expenses**
- **Total direct profit** (Income - Expenses)
- **Lease Installment**
- **Total Net profit** (Direct Profit - Lease)
- **Totals column** summing all buses

## Data Sources Available
- `school_students` — students with `bus_reg_no`, `route`, `payment_amount`, `payment_status`, `branch_id`
- `school_routes` — route records with `bus_reg_no`, `total_income`, `total_expenses`, `net_profit`
- `route_expenses` — individual expense records with `expense_type`, `expense_category`, `amount`, `route_id`, `branch_id`
- `route_staff_costs` — driver/caretaker salaries with `staff_type`, `monthly_salary`, `route_id`, `branch_id`
- `school_payments` — payment transactions

## Plan

### 1. Rewrite `SchoolBranchReports.tsx` — Full Branch P&L Report

Replace the current minimal page with a comprehensive report:

**Data Fetching**: Query all buses for the branch by grouping `school_students` by `bus_reg_no`, then fetch `route_expenses` and `route_staff_costs` for each route. Build a per-bus financial model:
- Income: sum of `payment_amount` for paid students per bus
- Fuel: sum of `route_expenses` where `expense_type = 'fuel'`
- Maintenance: sum where `expense_type = 'maintenance'`
- Driver salary: sum of `route_staff_costs` where `staff_type = 'driver'`
- Caretaker salary: sum where `staff_type = 'caretaker'`
- Parking: sum where `expense_type = 'parking'`
- Other: remaining expenses
- Direct profit = Income - Total expenses

**Excel-Style Spreadsheet Table**: Render a horizontally scrollable table matching the Excel layout — rows for each financial line item, columns for each bus (showing route name + reg no in header), plus a Totals column. Color-code profit rows: green for positive, red (pink) for negative — exactly like the Excel.

### 2. Add Charts Section

Below the spreadsheet table, add 4 charts using Recharts:

1. **Income vs Expenses Bar Chart** — grouped bars per bus showing income (green) and total expenses (red)
2. **Expense Breakdown Stacked Bar Chart** — per bus, stacked by category (fuel, maintenance, driver salary, caretaker salary, parking, other)
3. **Profit/Loss Bar Chart** — per bus net profit bars, green for positive, red for negative
4. **Expense Category Pie Chart** — aggregate expense distribution across all buses

### 3. Fix Export Functions

Replace the placeholder `exportReport` with real CSV and PDF export using `xlsx-js-style` and `jspdf`/`jspdf-autotable` (already installed), generating the same spreadsheet-style layout.

### 4. Add Month Selector

The Excel shows "For the month of January 2026". Add a month/year picker alongside the date range so users can quickly select a reporting month, which filters expenses and payments to that period.

### Files to Change

| File | What |
|---|---|
| `src/pages/SchoolBranchReports.tsx` | Complete rewrite with bus-by-bus P&L table, charts, and real exports |

This is a single-file change that transforms the placeholder into a production-grade Excel-equivalent report with visual charts.

