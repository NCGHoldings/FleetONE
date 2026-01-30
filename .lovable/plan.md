
# NCG Express Public Transport - Complete Finance Integration Plan

## Overview

NCG Express is a standalone company (separate from NCG Holding) that operates **Public Transport services**. The operations involve:
- **Daily Trips**: Route-based bus trips generating ticket revenue (income)
- **Daily Bus Expenses**: 21 expense categories per bus per day (fuel, repairs, salary, etc.)

Currently, these operational records exist in the database but are NOT connected to the Finance/Accounting module. This plan builds the complete Operations-to-Finance integration.

---

## Architecture Summary

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NCG EXPRESS FINANCE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Company: NCG Express (NCGE) - STANDALONE (Separate GL from NCG Holding)        │
│  Company ID: 7ece7595-8b7b-46de-8bfc-c1e8e0da7513                               │
│  Business Unit Code: NCGE                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

OPERATIONS LAYER                           FINANCE LAYER
─────────────────                          ─────────────
┌──────────────────┐                      ┌──────────────────┐
│   daily_trips    │  ─── Revenue GL ──→  │ journal_entries  │
│ (ticket income)  │                      │                  │
└──────────────────┘                      │ (NCG Express GL) │
                                          │                  │
┌──────────────────┐                      │                  │
│daily_bus_expenses│  ─── Expense GL ──→  │                  │
│ (21 categories)  │                      └────────┬─────────┘
└──────────────────┘                               │
                                                   ▼
                                          ┌──────────────────┐
                                          │ chart_of_accounts│
                                          │ (NCG Express CoA)│
                                          └──────────────────┘
```

---

## Phase 1: Database Schema

### New Table: `ncg_express_finance_settings`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `company_id` | uuid | NCG Express company ID |
| **Revenue Accounts** | | |
| `ticket_revenue_account_id` | uuid | Credit: Bus ticket revenue |
| `route_revenue_account_id` | uuid | (Optional) Per-route revenue tracking |
| `cash_account_id` | uuid | Debit: Cash received from conductors |
| **Expense Accounts** | | |
| `fuel_expense_account_id` | uuid | Debit: Diesel/Fuel costs |
| `repair_expense_account_id` | uuid | Debit: Repairs & maintenance |
| `tyre_expense_account_id` | uuid | Debit: Tyre & tube expenses |
| `salary_expense_account_id` | uuid | Debit: Driver/conductor salary |
| `police_expense_account_id` | uuid | Debit: Police fines |
| `food_expense_account_id` | uuid | Debit: Staff food allowance |
| `highway_expense_account_id` | uuid | Debit: Highway tolls |
| `parking_expense_account_id` | uuid | Debit: Parking charges |
| `permit_expense_account_id` | uuid | Debit: Permits & renewals |
| `general_expense_account_id` | uuid | Debit: Miscellaneous/other |
| `expense_cash_account_id` | uuid | Credit: Cash paid for expenses |
| **Auto-posting Toggles** | | |
| `auto_post_revenue` | boolean | Auto-post when trip income entered |
| `auto_post_expenses` | boolean | Auto-post when expenses saved |
| `revenue_prefix` | text | JE prefix: "NCGE-REV" |
| `expense_prefix` | text | JE prefix: "NCGE-EXP" |

### Table Modifications

| Table | New Columns | Purpose |
|-------|-------------|---------|
| `daily_trips` | `journal_entry_id`, `gl_posted` | Link trip to GL entry |
| `daily_bus_expenses` | `journal_entry_id`, `gl_posted` | Link expenses to GL entry |

---

## Phase 2: Settings Page

**File**: `src/components/settings/NCGExpressFinanceSettings.tsx`

### UI Sections

1. **Revenue Account Mappings**
   - Ticket Revenue Account (Credit on trip income)
   - Cash/Bank Account (Debit when income received)

2. **Expense Account Mappings** (21 categories → GL accounts)
   - Fuel/Diesel → Fuel Expense Account
   - Repair → Repair & Maintenance Account
   - Tyre & Tube → Vehicle Parts Account
   - Salary → Staff Salary Account
   - Police → Fines & Penalties Account
   - Food → Staff Welfare Account
   - Highway Charges → Transport Expense Account
   - Parking → Parking Expense Account
   - Permits/Emission/Fitness → Regulatory Expense Account
   - Other/Miscellaneous → General Expense Account
   - Expense Cash/Bank Account (Credit when paying expenses)

3. **Auto-Posting Settings**
   - Toggle: Auto-post Revenue on Trip Entry
   - Toggle: Auto-post Expenses on Save
   - JE Prefix configuration

---

## Phase 3: Finance Integration Hook

**File**: `src/hooks/useNCGExpressFinance.ts`

### Key Functions

```text
1. useNCGExpressFinanceSettings()
   - Fetch finance settings for NCG Express

2. usePostTripRevenueToGL()
   - Trigger: Trip with income is saved
   - GL Entry:
     DR Cash/Bank        [income amount]
     CR Ticket Revenue   [income amount]
   - Tags: business_unit_code = 'NCGE'

3. usePostExpensesToGL()
   - Trigger: Daily bus expense is saved
   - GL Entry: Multiple lines based on expense categories
     DR Fuel Expense     [fuel_cost]
     DR Repair Expense   [repair]
     DR Tyre Expense     [tyre_tube]
     DR Salary Expense   [salary]
     ... (all 21 categories)
     CR Expense Cash     [total_daily_expenses]
   - Tags: business_unit_code = 'NCGE'

4. useBulkPostRevenueToGL()
   - Batch post multiple trips' revenue to GL
   - Date range selection

5. useBulkPostExpensesToGL()
   - Batch post multiple days' expenses to GL
```

---

## Phase 4: Accounting Flow Diagrams

### Flow 1: Daily Trip Revenue Recognition

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TRIP REVENUE TO GL FLOW                                     │
│                      Trigger: User saves daily trip with income                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. VALIDATE SETTINGS                                                           │
│     └─ Check auto_post_revenue = true                                           │
│     └─ Validate cash_account_id configured                                      │
│     └─ Validate ticket_revenue_account_id configured                            │
│                                                                                  │
│  2. CREATE JOURNAL ENTRY                                                        │
│     └─ entry_number: NCGE-REV-{BUS_NO}-{TRIP_DATE}                              │
│     └─ description: "Daily Trip Revenue - {Route Name} - {Bus No}"              │
│     └─ company_id: NCG Express Company ID                                       │
│     └─ business_unit_code: NCGE                                                 │
│     └─ status: "posted"                                                         │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Cash/Bank Account (Asset)              │ INCOME    │           │            │
│  │ Ticket Revenue (Revenue)               │           │ INCOME    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  3. UPDATE COA BALANCES                                                         │
│     └─ Cash: +INCOME (Debit normal - increases)                                 │
│     └─ Revenue: +INCOME (Credit normal - increases)                             │
│                                                                                  │
│  4. LINK TO TRIP                                                                │
│     └─ daily_trips.journal_entry_id = JE ID                                     │
│     └─ daily_trips.gl_posted = true                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Daily Expense Recording

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      EXPENSE TO GL FLOW                                          │
│                      Trigger: User saves daily bus expenses                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. VALIDATE SETTINGS                                                           │
│     └─ Check auto_post_expenses = true                                          │
│     └─ Validate expense accounts configured                                     │
│     └─ Validate expense_cash_account_id configured                              │
│                                                                                  │
│  2. CREATE JOURNAL ENTRY                                                        │
│     └─ entry_number: NCGE-EXP-{BUS_NO}-{EXPENSE_DATE}                           │
│     └─ description: "Daily Bus Expenses - {Bus No} - {Date}"                    │
│     └─ company_id: NCG Express Company ID                                       │
│     └─ business_unit_code: NCGE                                                 │
│     └─ status: "posted"                                                         │
│                                                                                  │
│  JOURNAL ENTRY LINES (only non-zero amounts):                                   │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Fuel Expense                           │ fuel_cost │           │            │
│  │ Repair & Maintenance                   │ repair    │           │            │
│  │ Tyre & Tube Expense                    │ tyre_tube │           │            │
│  │ Salary Expense                         │ salary    │           │            │
│  │ Food/Staff Welfare                     │ food      │           │            │
│  │ Highway Toll Expense                   │ highway   │           │            │
│  │ Parking Expense                        │ parking   │           │            │
│  │ ... (other categories)                 │ ...       │           │            │
│  │ Expense Cash/Bank Account              │           │ TOTAL     │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  3. UPDATE COA BALANCES                                                         │
│     └─ Each Expense: +Amount (Debit normal - increases)                         │
│     └─ Cash: -TOTAL (Debit normal, credit reduces)                              │
│                                                                                  │
│  4. LINK TO EXPENSE                                                             │
│     └─ daily_bus_expenses.journal_entry_id = JE ID                              │
│     └─ daily_bus_expenses.gl_posted = true                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: UI Integration

### Settings Tab Addition

**File**: `src/pages/Settings.tsx`

Add new tab: "NCG Express Finance"
- Import `NCGExpressFinanceSettings` component
- Add Tab trigger with Bus icon

### Daily Trips Page Enhancement

**File**: `src/pages/DailyTrips.tsx`

Add features:
- GL Status indicator on each trip row
- "Post to GL" button for manual posting
- Batch GL posting action
- Filter: "Show only unposted trips"

### Daily Bus Expenses Page Enhancement

**File**: `src/pages/DailyBusExpenses.tsx`

Add features:
- GL Status badge on expense cards
- "Post Expenses to GL" action button
- Bulk posting for date range

---

## Phase 6: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/settings/NCGExpressFinanceSettings.tsx` | Settings UI for GL mappings |
| `src/hooks/useNCGExpressFinance.ts` | Finance integration hook with GL posting |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add "NCG Express Finance" tab |
| `src/pages/DailyTrips.tsx` | Add GL posting UI & status |
| `src/pages/DailyBusExpenses.tsx` | Add GL posting UI & status |
| `src/hooks/useDailyBusExpenses.ts` | Integrate GL posting on save |
| `src/hooks/useDailyBusGroupedTrips.ts` | Integrate GL posting on trip save |

### Database Migrations

1. Create `ncg_express_finance_settings` table
2. Add `journal_entry_id` and `gl_posted` columns to `daily_trips`
3. Add `journal_entry_id` and `gl_posted` columns to `daily_bus_expenses`

---

## Implementation Order

1. **Database First**: Create settings table and add columns
2. **Settings UI**: Build the NCG Express Finance Settings page
3. **Hook Development**: Create `useNCGExpressFinance.ts` with GL posting logic
4. **Integration**: Connect hooks to existing trip/expense save operations
5. **UI Enhancement**: Add GL status and manual posting buttons
6. **Testing**: Verify GL entries and COA balance updates

---

## Expected Outcome

After implementation:
- Every daily trip with income automatically posts revenue to NCG Express GL
- Every daily expense record automatically posts categorized expenses to GL
- Finance team can view NCG Express P&L with real operational data
- Full audit trail from Operation → Journal Entry → COA balances
- Consistent with other modules (School Bus, Special Hire, Yutong, etc.)
