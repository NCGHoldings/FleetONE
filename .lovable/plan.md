

# Enhance Yutong Executive Report -- Advanced Analytics & Filters

## Overview

Transform the current basic report into a comprehensive, CEO-grade analytics dashboard with period comparison, filtering, forecasting, and richer visualizations. The current report has 8 KPI cards, a pipeline funnel, revenue chart, operations pipeline, shipment groups, bus models, top customers, after-sales, and basic predictive insights. We will significantly expand each section and add entirely new analytical components.

## What Gets Added

### 1. Date Range Filter & Period Comparison (New Component)

**New file: `YutongReportFilters.tsx`**

- Date range picker (This Month, Last 30 Days, Last Quarter, This Year, Custom Range)
- "Compare with previous period" toggle -- automatically computes the equivalent prior period
- Bus model filter dropdown (multi-select from available models)
- Payment mode filter (Cash / Lease / All)
- Customer filter dropdown (multi-select)

**Impact on data hook:** The `useYutongExecutiveReport` hook will accept optional `startDate`, `endDate`, `compareStartDate`, `compareEndDate` parameters. Queries will filter by date ranges using `.gte()` and `.lte()` on `created_at` / `order_date`. The hook returns both `current` and `previous` period data for comparison.

### 2. Enhanced KPI Cards with Change Indicators

**Modified: `YutongReportKPICards.tsx`**

- Each KPI card shows a green/red arrow with % change vs previous period
- Sparkline mini-chart (last 6 months trend) inside each card
- New KPIs added: Average Deal Size, Pipeline Velocity (days from quote to order), Win Rate Trend, Revenue per Unit

### 3. New Component: Period Comparison Section

**New file: `YutongPeriodComparison.tsx`**

- Side-by-side comparison cards: Current Period vs Previous Period for key metrics (Revenue, Orders, Conversion, Collection Rate, Units Delivered)
- Each with absolute values + % change + color-coded indicator
- A grouped bar chart comparing the two periods across all key metrics (normalized to %)

### 4. New Component: Revenue Breakdown & Forecasting

**New file: `YutongRevenueForecasting.tsx`**

- 12-month revenue trend with a 3-month forecast line (based on moving average of last 3 months)
- Revenue by bus model (stacked bar chart)
- Revenue by payment mode (Cash vs Lease donut)
- Outstanding collections aging analysis: 0-30 days, 31-60 days, 61-90 days, 90+ days (based on `payment_schedules.due_date`)

### 5. New Component: Sales Velocity & Conversion Analytics

**New file: `YutongSalesVelocity.tsx`**

- Average days from Quotation to Confirmation (using `yutong_quotations.created_at` vs orders matching confirmed quotations)
- Average days from Order to Delivery (using `order_date` vs `actual_delivery_date`)
- Conversion funnel with % at each stage and comparison to previous period
- Win/Loss analysis: confirmed vs rejected quotations ratio over time (line chart)

### 6. New Component: Customer Analytics Deep Dive

**New file: `YutongCustomerAnalytics.tsx`**

- Customer concentration chart (% of revenue from top 3, top 5, top 10 customers -- pie/donut)
- New vs Repeat customer breakdown (customers with 1 order vs 2+ orders)
- Customer satisfaction correlation: rating vs order value scatter (if enough data)
- Top customers table enhanced with: order trend (up/down arrow), average order value, last order date

### 7. Enhanced Operations Pipeline

**Modified: `YutongShipmentStatus.tsx`**

- Add average time-in-stage metrics
- Add bottleneck indicator (which stage has the most items stuck)
- Expected completion timeline based on historical throughput rates

### 8. New Component: Executive Summary Cards

**New file: `YutongExecutiveSummary.tsx`**

- "Health Score" card (composite score 0-100 based on: conversion rate weight 25%, collection rate 25%, delivery rate 25%, customer satisfaction 25%)
- Key alerts section: Overdue payments, stalled orders (no phase change in 30+ days), expiring quotations
- Quick action recommendations based on data patterns

## Technical Details

### Files to Create (6 new):
- `src/components/yutong/report/YutongReportFilters.tsx`
- `src/components/yutong/report/YutongPeriodComparison.tsx`
- `src/components/yutong/report/YutongRevenueForecasting.tsx`
- `src/components/yutong/report/YutongSalesVelocity.tsx`
- `src/components/yutong/report/YutongCustomerAnalytics.tsx`
- `src/components/yutong/report/YutongExecutiveSummary.tsx`

### Files to Modify (4):
- `src/hooks/useYutongExecutiveReport.ts` -- Add date filtering, previous period data, new computed fields (velocity metrics, aging, health score)
- `src/components/yutong/report/YutongExecutiveReport.tsx` -- New layout with filters at top, executive summary, all new sections integrated
- `src/components/yutong/report/YutongReportKPICards.tsx` -- Add change indicators and sparklines
- `src/components/yutong/report/YutongShipmentStatus.tsx` -- Add bottleneck and timing metrics

### Data Hook Changes (`useYutongExecutiveReport.ts`):

New fields added to `YutongReportData`:

```text
previousPeriod: { ... same shape as current metrics ... } | null
velocity: {
  avgQuoteToOrderDays: number
  avgOrderToDeliveryDays: number
  avgCollectionDays: number
}
aging: {
  current: number      // 0-30 days
  days31to60: number
  days61to90: number
  over90: number
}
healthScore: number    // 0-100 composite
alerts: Array<{ type: string; message: string; severity: 'info'|'warning'|'critical' }>
customerBreakdown: {
  newCustomers: number
  repeatCustomers: number
  topConcentration: number  // % revenue from top 3
}
```

Additional queries needed:
- `yutong_quotations` with date range filters for velocity calculation
- `yutong_payment_schedules` with `due_date` analysis for aging
- `yutong_orders` with `expected_delivery_date` for delivery projections

### Layout Structure (top to bottom):

```text
[Filters: Date Range | Compare Toggle | Model | Payment Mode]
[Executive Summary: Health Score | Key Alerts | Recommendations]
[KPI Cards Row 1: 4 cards with sparklines + change %]
[KPI Cards Row 2: 4 cards with sparklines + change %]
[Period Comparison: Side-by-side current vs previous]
[Pipeline Funnel | Revenue Trend + Forecast]
[Sales Velocity | Conversion Analytics]
[Revenue Breakdown: By Model | By Payment Mode | Aging]
[Operations Pipeline (enhanced) | Shipment Groups]
[Bus Model Performance | Customer Analytics Deep Dive]
[Top Customers (enhanced) | After Sales Health]
[Predictive Insights (enhanced with forecast)]
```

All charts use Recharts (already installed). No new dependencies needed.
