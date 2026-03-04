

# Yutong Orders -- Live Spreadsheet with Public Sharing

## What You're Getting

A full-featured, Excel-like spreadsheet view of Yutong Orders that:
- Lives inside the system as a new tab ("Spreadsheet") on the Yutong Quotations page
- Can be opened externally via a shareable link (like the existing Executive Report sharing)
- Allows authorized users to **edit cells inline** and changes **instantly save** to the database
- Feeds data to the Reports tab (Executive Report already pulls from `yutong_orders`)
- Has a visual preview/summary panel above the spreadsheet

## Spreadsheet Columns

Based on your reference image and the existing order data, the columns will be:

| # | Column | Source | Editable |
|---|--------|--------|----------|
| 1 | Order No | `yutong_orders.order_no` | No |
| 2 | Customer | `yutong_quotations.customer_name` | No |
| 3 | Company | `yutong_quotations.company_name` | No |
| 4 | Bus Model | `yutong_orders.bus_model` | No |
| 5 | Qty | `yutong_orders.quantity` | No |
| 6 | Total Amount | `yutong_orders.total_amount` | No |
| 7 | Status | `yutong_orders.status` | Yes (dropdown) |
| 8 | Current Phase | `yutong_orders.current_phase` | Yes (dropdown) |
| 9 | DO | `yutong_delivery_orders.do_no` / status | Read-only summary |
| 10 | CR (Cash Receipt) | Sum of `yutong_cash_receipts.amount` | Read-only summary |
| 11 | Cheque | Payments where `payment_method = 'cheque'` | Read-only summary |
| 12 | Cash | Payments where `payment_method = 'cash'` | Read-only summary |
| 13 | Total Paid | `yutong_orders.total_paid` | No |
| 14 | Balance Due | `yutong_orders.balance_due` | No |
| 15 | Payment Mode | `yutong_orders.payment_mode` | Yes (dropdown) |
| 16 | Progress % | `yutong_orders.progress_percentage` | Yes |
| 17 | Order Date | `yutong_orders.order_date` | No |
| 18 | Expected Delivery | `yutong_orders.expected_delivery_date` | Yes |
| 19 | Remark | `yutong_orders.notes` | Yes (text) |

## Architecture

```text
                    INTERNAL (System)                    EXTERNAL (Public Link)
                    ================                    ====================
                    /yutong-quotations?tab=spreadsheet   /public/yutong-spreadsheet?code=XXXXXX
                           |                                      |
                           v                                      v
                    YutongOrderSpreadsheet.tsx            PublicYutongSpreadsheet.tsx
                    (full edit access)                   (access code gate -> same component)
                           |                                      |
                           +------ Both use same core ------+
                                          |
                                YutongSpreadsheetCore.tsx
                                (Excel-like grid with inline editing,
                                 frozen headers, cell styling,
                                 auto-save on blur)
                                          |
                                    Supabase DB
                                (yutong_orders + joins)
                                          |
                                    Reports Tab
                                (YutongExecutiveReport already
                                 reads from same tables)
```

## Implementation Plan

### 1. Database: New edge function for public spreadsheet access
- `supabase/functions/yutong-spreadsheet-data/index.ts`
- Validates access code (same pattern as `yutong-executive-report`)
- Returns orders with joined data (quotations, delivery orders, cash receipts, payments)
- Supports POST for updates (with access code validation)

### 2. Share Dialog: Add spreadsheet sharing
- Update `YutongReportShareDialog.tsx` or create a new `YutongSpreadsheetShareDialog.tsx`
- Generates a separate access code for spreadsheet access (or reuses the same report code)
- Share URL: `/public/yutong-spreadsheet?code=XXXXXX`

### 3. Core Spreadsheet Component (the main build)
- `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx`
- Advanced Excel-like features:
  - **Frozen header row** with column resize handles
  - **Inline cell editing**: click a cell to edit, blur/Enter to save
  - **Dropdown selects** for Status, Phase, Payment Mode
  - **Color-coded cells**: green for paid, red for overdue, yellow for partial
  - **Row totals** and **column summaries** (total amount, total paid, total balance)
  - **Search/filter bar** at top
  - **Excel export** button
  - **Auto-save** with debounce -- changes write to Supabase instantly
  - **Visual summary panel** above the grid showing KPI cards (total orders, total value, collection rate)

### 4. Internal Page Integration
- Add "Spreadsheet" tab to `YutongQuotations.tsx` (alongside Orders, Reports, etc.)
- `src/components/yutong/spreadsheet/YutongOrderSpreadsheet.tsx` -- wrapper that loads data via authenticated Supabase client

### 5. Public Page
- `src/pages/PublicYutongSpreadsheet.tsx` -- access code gate (same pattern as `PublicYutongReport.tsx`)
- Route: `/public/yutong-spreadsheet`
- After verification, renders `YutongSpreadsheetCore` in edit mode (or read-only mode based on a permission flag in the access code)

### 6. Hook for Data
- `src/hooks/useYutongSpreadsheetData.ts`
- Fetches orders with all joins (quotations, delivery orders, aggregated payments by method)
- Provides `updateOrderField(orderId, field, value)` mutation with optimistic updates
- Real-time subscription for live updates when multiple users edit

## Files to Create
1. `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx` -- main grid
2. `src/components/yutong/spreadsheet/YutongOrderSpreadsheet.tsx` -- internal wrapper
3. `src/components/yutong/spreadsheet/YutongSpreadsheetShareDialog.tsx` -- share link
4. `src/hooks/useYutongSpreadsheetData.ts` -- data hook
5. `src/pages/PublicYutongSpreadsheet.tsx` -- public access page
6. `supabase/functions/yutong-spreadsheet-data/index.ts` -- edge function for public access + updates

## Files to Modify
1. `src/pages/YutongQuotations.tsx` -- add Spreadsheet tab
2. `src/App.tsx` -- add `/public/yutong-spreadsheet` route

## How It Links to Reports
The spreadsheet reads from and writes to `yutong_orders`, `yutong_customer_payments`, and `yutong_cash_receipts` -- the same tables the Executive Report dashboard already queries. Any update in the spreadsheet is **immediately reflected** in the Reports tab.

