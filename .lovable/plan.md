

# Add Complaints Module to Company Module Overview Dashboard

## What's Missing

The **Complaints** module exists in the app (page at `/complaints`, 4 records in DB) but is **not shown** in the Module Overview dashboard (`RealDataSummary.tsx`). All other modules (Fleet, Staff, Special Hire, Yutong, School Bus, Maintenance, Accounting, Daily Trips, Routes, Accidents) are listed there — Complaints is missing.

## Plan

### 1. Add Complaints to the Module Overview Dashboard (`RealDataSummary.tsx`)

- Add a query for `feedback_complaints` in the `Promise.all` block (fetch `id, status, type`)
- Count total complaints, and count open/unresolved complaints as `issueCount`
- Add a new module card: `{ name: 'Complaints', icon: <MessageSquareWarning />, count: total, issueCount: openCount, path: '/complaints', color: 'text-rose-400', bgColor: 'bg-rose-500/20' }`

### 2. Add Complaints to Cross-Module Checks (`useCrossModuleChecks.ts`)

- Add a check for unresolved complaints older than 48 hours (SLA breach)
- This gives visibility into complaint handling performance on the system health dashboard

## Files
- **Modify**: `src/components/system-health/RealDataSummary.tsx` — add `feedback_complaints` query and Complaints module card
- **Modify**: `src/hooks/useCrossModuleChecks.ts` — add SLA check for overdue complaints

## Result
Complaints will appear as a clickable module card in the dashboard showing total count and open issues, matching all other modules.

