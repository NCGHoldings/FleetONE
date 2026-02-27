
# Yutong CEO Executive Report Dashboard

A comprehensive, CEO-presentation-grade analytics and reporting page for the entire Yutong Bus Sales division. This page will aggregate data from all 49 Yutong tables into a single, visually rich, auto-updating dashboard -- and it can be shared via a public link with an access code.

---

## What Gets Built

### 1. Data Hook: `useYutongExecutiveReport`

A React Query hook that fetches and aggregates data from across all Yutong tables into a single analytics object:

| Data Section | Source Tables | Metrics |
|---|---|---|
| **Pipeline Overview** | `yutong_quotations` | Total quotations, by status (draft/sent/confirmed/rejected), conversion rate, avg quotation value |
| **Order Performance** | `yutong_orders` | Total orders, by phase, total order value, avg order value, cash vs lease split |
| **Payment & Finance** | `yutong_payment_schedules`, `yutong_letter_of_credits` | Total collected, outstanding, overdue payments, LC status breakdown |
| **Shipment Tracking** | `yutong_shipment_groups`, `yutong_shipments` | Shipments by status (planning/in_transit/delivered), avg transit time |
| **Operations Pipeline** | `yutong_customs_declarations`, `yutong_vehicle_processing`, `yutong_rmv_registrations` | Units in customs, processing, RMV stages |
| **Delivery & Handover** | `yutong_delivery_inspections`, `yutong_delivery_confirmations`, `yutong_customer_handovers` | Delivered count, pending inspections, handover completion rate |
| **After Sales** | `yutong_warranties`, `yutong_service_reminders`, `yutong_support_tickets`, `yutong_customer_feedback` | Active warranties, open tickets, avg feedback rating |
| **Monthly Trends** | All above | Monthly quotation/order/delivery counts for trend charts |
| **Top Customers** | `yutong_orders` joined with `yutong_customers` | Top 10 by order value |
| **Bus Model Performance** | `yutong_orders`, `yutong_quotations` | Orders/quotations by bus model |

The hook uses `refetchInterval: 60000` (1 min) for live auto-updates.

---

### 2. Report Page: `YutongExecutiveReport.tsx`

A professional, print-ready dashboard page with the following sections:

**Header Bar:**
- NCG Holdings logo + "Yutong Bus Sales -- Executive Report"
- Report generation timestamp (auto-updates)
- "Share Report" button (generates link + access code)
- "Export to Excel" button

**Section A -- Executive Summary (KPI Cards Row)**
- Total Quotations | Conversion Rate | Active Orders | Total Revenue
- Total Collected | Outstanding Balance | Units Delivered | Customer Satisfaction

**Section B -- Sales Pipeline Funnel**
- Visual funnel chart: Quotations -> Confirmed -> Orders -> Shipped -> Delivered
- Shows count and value at each stage with drop-off percentages

**Section C -- Revenue & Payments**
- Bar chart: Monthly revenue trend (last 12 months)
- Pie chart: Payment status breakdown (Paid/Pending/Overdue)
- Progress bar: Overall collection rate
- Cash vs Lease payment mode split

**Section D -- Shipment & Operations Status**
- Horizontal stacked bar: Units by current phase (ordering -> shipping -> customs -> processing -> RMV -> delivery)
- Shipment group status cards (planning/in_transit/customs/delivered counts)

**Section E -- Order Phase Distribution**
- Donut chart showing orders across all phases
- Table: Top 10 orders by value with current phase and payment status

**Section F -- Bus Model Performance**
- Bar chart: Orders by bus model
- Table: Model, Units Ordered, Total Value, Avg Price

**Section G -- Top Customers**
- Table: Customer Name, Company, Orders Count, Total Value, Payment Status

**Section H -- After Sales Health**
- Cards: Active Warranties, Open Support Tickets, Pending Service Reminders
- Star rating display for average customer feedback
- Upcoming service reminders list

**Section I -- Predictive Insights**
- Projected monthly deliveries based on current pipeline
- Estimated revenue from pending orders
- Overdue payment risk summary

All charts use Recharts (already installed). Layout uses CSS grid for clean, print-friendly formatting.

---

### 3. Public Shareable Report: `PublicYutongReport.tsx`

A public (unauthenticated) page at `/public/yutong-report` that:

- Accepts an access code via URL query param (`?code=XXXX`)
- Shows a code-entry form if no code or invalid code
- On valid code, renders the same `YutongExecutiveReport` component in read-only mode
- Access codes stored in `yutong_report_access` table (or `system_settings` JSONB)

**Access Code System:**
- When "Share Report" is clicked, a 6-character alphanumeric code is generated
- Code is stored in `system_settings` with key `yutong_report_access_code`
- Code can be regenerated anytime
- The public page fetches data using Supabase anon key with RLS policies allowing SELECT for authenticated OR matching access code

Since creating new RLS policies for public access is complex, the simpler approach: Create a Supabase Edge Function `yutong-executive-report` that:
- Accepts the access code as a header
- Validates it against `system_settings`
- If valid, queries all Yutong tables using the service role key
- Returns the aggregated analytics JSON

The public page calls this edge function instead of querying Supabase directly.

---

### 4. Excel Export

Reuse the existing `xlsx-js-style` pattern (from NSP reports) to generate a multi-sheet Excel workbook:

| Sheet | Content |
|---|---|
| Executive Summary | KPI metrics, report date, period |
| Sales Pipeline | Quotation/Order/Delivery funnel data |
| Orders Detail | All orders with phase, amount, payment status |
| Payments | Payment schedule with status |
| Shipments | Shipment groups with status and dates |
| Customers | Top customers ranked by value |
| After Sales | Warranties, tickets, feedback |

---

### 5. Routing & Integration

| File | Change |
|---|---|
| `App.tsx` | Add public route: `/public/yutong-report` -> `PublicYutongReport` |
| `YutongQuotations.tsx` | Add "Reports" tab with BarChart3 icon wired to `YutongExecutiveReport` |

---

## Files to Create

| File | Purpose |
|---|---|
| `src/hooks/useYutongExecutiveReport.ts` | Data aggregation hook (React Query) |
| `src/components/yutong/report/YutongExecutiveReport.tsx` | Main report dashboard component |
| `src/components/yutong/report/YutongReportKPICards.tsx` | Executive summary KPI row |
| `src/components/yutong/report/YutongPipelineFunnel.tsx` | Sales funnel visualization |
| `src/components/yutong/report/YutongRevenueCharts.tsx` | Revenue trend + payment charts |
| `src/components/yutong/report/YutongShipmentStatus.tsx` | Shipment & operations pipeline |
| `src/components/yutong/report/YutongModelPerformance.tsx` | Bus model analysis charts |
| `src/components/yutong/report/YutongTopCustomers.tsx` | Top customers table |
| `src/components/yutong/report/YutongAfterSalesHealth.tsx` | After-sales KPIs |
| `src/components/yutong/report/YutongReportShareDialog.tsx` | Share link + code generator |
| `src/components/yutong/report/YutongExcelExporter.ts` | Multi-sheet Excel export |
| `src/pages/PublicYutongReport.tsx` | Public report page with code entry |
| `supabase/functions/yutong-executive-report/index.ts` | Edge function for public data access |

## Files to Modify

| File | Change |
|---|---|
| `src/pages/YutongQuotations.tsx` | Add "Reports" tab trigger + content |
| `src/App.tsx` | Add `/public/yutong-report` route |

---

## Technical Approach

- All charts built with Recharts (AreaChart, BarChart, PieChart, FunnelChart via custom SVG)
- LKR currency formatting throughout using `toLocaleString()`
- Auto-refresh every 60 seconds for live dashboard feel
- Print-optimized CSS with `@media print` rules
- Edge function uses Supabase service role for public access (no RLS bypass needed)
- Access code validated server-side in the edge function
- The report page is designed to be presentation-ready for CEO meetings
