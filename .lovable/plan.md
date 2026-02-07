
# Remaining Implementation - Wire Missing Tabs

## Overview
The core UI components and edge functions are complete. The only remaining work is to add 4 missing tabs to the Reports and Settings modules in `Accounting.tsx`.

## Changes Required

### 1. Reports Module (lines 714-766)
Add 3 new tabs to the existing Reports module:

**Current tabs:**
- Fleet Operating Costs, Trial Balance, Financial Statements, Cash Flow, Segment Reports, Tax Reports, SSCL, Tax Returns, Audit

**Add:**
- "Report Builder" tab → `<ReportBuilder />`
- "Cash Flow Forecast" tab → `<CashFlowForecastView />`
- "Report Scheduler" tab → `<ReportSchedulerView />`

### 2. Settings Module (lines 800-853)
Add 1 new tab to the existing Settings module:

**Current tabs:**
- Companies, Module Integration, Document Templates, Costing, Approval Workflow, User Activity, Notifications, Data Import, Balance Reconciliation

**Add:**
- "API & Webhooks" tab → `<APIWebhooksSettings />`

## Technical Details

### File to Modify
`src/pages/Accounting.tsx`

### Reports Module Changes (around line 717)
```tsx
// Add to TabsList:
<TabsTrigger value="report-builder">Report Builder</TabsTrigger>
<TabsTrigger value="cashflow-forecast">Cash Flow Forecast</TabsTrigger>
<TabsTrigger value="scheduled-reports">Scheduled Reports</TabsTrigger>

// Add TabsContent sections:
<TabsContent value="report-builder">
  <ReportBuilder />
</TabsContent>

<TabsContent value="cashflow-forecast">
  <CashFlowForecastView />
</TabsContent>

<TabsContent value="scheduled-reports">
  <ReportSchedulerView />
</TabsContent>
```

### Settings Module Changes (around line 804)
```tsx
// Add to TabsList:
<TabsTrigger value="api-webhooks">API & Webhooks</TabsTrigger>

// Add TabsContent section:
<TabsContent value="api-webhooks">
  <APIWebhooksSettings />
</TabsContent>
```

## Implementation Summary

| Task | Effort | Impact |
|------|--------|--------|
| Add 3 tabs to Reports module | 5 minutes | Enables Report Builder, Forecasting, Scheduling |
| Add 1 tab to Settings module | 2 minutes | Enables API key and webhook management |

## Post-Implementation Status

After this change, the implementation will be:
- **Phases 3-5 UI**: 100% complete
- **Stripe Integration**: Deferred (as requested)
- **Zoho Books Parity**: ~88% (90%+ when Stripe is added later)

## What's NOT Needed
- No new files to create
- No database changes
- No edge function changes
- Components already exist and are imported
