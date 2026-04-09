

# Special Hire Reports & Analytics — Fully Automated Dashboard

## What You Have

2,459 quotations with rich data: revenue (LKR 468M), profit (LKR 458M), fuel costs (LKR 28M), commissions (LKR 344K), advance payments (LKR 7.9M), balance due (LKR 45.9M). Monthly trends spanning Jan 2026 to Feb 2027. All the data needed for comprehensive automated reports already exists.

## Reports to Build (8 Sections, All Auto-Generated)

### 1. Revenue & Profit Overview
- KPI cards: Total Revenue, Total Profit, Profit Margin %, Average Trip Value
- Revenue vs Profit trend line chart (monthly)
- Period selector (This Month / Quarter / Year / Custom)

### 2. Trip Performance Analytics
- Total trips by status (confirmed, completed, cancelled, on-hold)
- Trips per month bar chart with growth trend
- Average revenue per trip over time
- Busiest months/days heatmap

### 3. Financial Summary
- Revenue breakdown: Hire Charge vs Extra Charges vs Overtime vs Overnight
- Expense breakdown: Fuel + Driver + Commission + Other Expenses (pie chart)
- Net profit margin trend (line chart)
- Cost-per-KM analysis

### 4. Fuel & Efficiency Report
- Total fuel cost vs revenue ratio
- Average fuel cost per trip
- KM/L performance per bus type (green/red color coding against standard)
- Fuel cost trend over months

### 5. Payment & Collection Status
- Total Advance Collected (LKR 7.9M) vs Balance Due (LKR 45.9M)
- Collection rate % (advance/gross revenue)
- Outstanding receivables aging (0-30, 30-60, 60-90, 90+ days)
- Payment timeline chart

### 6. Bus & Route Analytics
- Top 10 most-used buses by trip count and revenue
- Top 10 most popular routes (pickup→drop)
- Revenue by bus type (bar chart)
- Bus utilization rate

### 7. Commission & Referral Report
- Total commissions paid (LKR 344K)
- Commission as % of revenue
- Top referral agents by trips and commission earned
- Commission trend over months

### 8. Executive Summary (Auto-PDF Export)
- One-page summary with all key KPIs
- Auto-generated insights (top performing month, highest revenue bus, collection gap)
- Export to PDF button for management reporting
- Date range filter applied across all sections

## Technical Approach

### New Component: `SpecialHireReportsTab.tsx`
- Replaces the "coming soon" placeholder in SpecialHire.tsx
- Queries `special_hire_quotations` with date range filters
- All calculations done client-side from the fetched data
- Uses Recharts (already in project) for all charts
- Responsive grid layout with collapsible sections

### Data Fetching
- Single query with date range filter fetches all quotations
- Client-side aggregation for monthly trends, bus stats, route stats
- No edge functions needed — all data already in the quotations table
- Memoized calculations to handle 2,459+ records efficiently

### Export
- PDF export using the same pattern as NSP/Yutong reports (html2canvas)
- CSV export for raw data tables

## Files to Create/Change

- **Create** `src/components/special-hire/reports/SpecialHireReportsTab.tsx` — main reports container with date filters
- **Create** `src/components/special-hire/reports/RevenueOverview.tsx` — KPI cards + revenue/profit charts
- **Create** `src/components/special-hire/reports/TripPerformance.tsx` — trip counts, status breakdown, trends
- **Create** `src/components/special-hire/reports/FinancialSummary.tsx` — expense breakdown, profit margins
- **Create** `src/components/special-hire/reports/FuelEfficiencyReport.tsx` — fuel costs, KM/L analysis
- **Create** `src/components/special-hire/reports/PaymentCollectionReport.tsx` — advances, outstanding, aging
- **Create** `src/components/special-hire/reports/BusRouteAnalytics.tsx` — top buses, routes, utilization
- **Create** `src/components/special-hire/reports/CommissionReport.tsx` — referral agent performance
- **Create** `src/hooks/useSpecialHireReports.ts` — data fetching + aggregation hook
- **Edit** `src/pages/SpecialHire.tsx` — replace "coming soon" with `SpecialHireReportsTab`

## Result

- 8 fully automated report sections — zero manual work
- All data pulled directly from existing quotation records
- Date range filtering across all reports
- PDF + CSV export for management sharing
- Color-coded performance indicators (fuel efficiency, collection rates)
- Works for any volume — from 10 trips to 10,000+

