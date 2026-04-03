

# Confirmed: Test Mode Data Leak in Special Hire Finance Approval

## Verdict: TRUE

The external AI's finding is **accurate**. `useFinanceApproval.ts` hardcodes `NCG_HOLDING_ID` (live) in all 11 locations. It never checks which company the user has selected, so any Special Hire approval done while in test mode writes directly to the live General Ledger.

## What leaks

| Data Type | Hardcoded Line(s) | Impact |
|-----------|-------------------|--------|
| Finance Settings fetch | 113, 738 | Always reads live settings (minor) |
| Customer creation | 135, 753 | Test customers appear in live customer list |
| AR Invoice creation | 212, 791 | Test invoices in live AR aging reports |
| GL Journal Entries (advance/full/balance) | 233, 245, 257 | Test JEs in live Trial Balance, P&L, Balance Sheet |
| Advance Application JE | 285 | Test advance clearing in live GL |
| AR Receipt creation | 315 | Test receipts in live receipt reports |

## Why it happens

`useFinanceApproval` is a React hook but it never reads the selected company from `CompanyContext`. It imports the constant `NCG_HOLDING_ID` and passes it directly to every finance function. The `getEffectiveCompanyId()` function in CompanyContext correctly resolves test sub-companies to `NCG_TEST_ID`, but it's never called here.

## Proposed Fix

### Approach
Pass the effective company ID into `useFinanceApproval` from the calling component, rather than hardcoding it.

### Files to modify

**1. `src/hooks/useFinanceApproval.ts`**
- Remove the hardcoded `NCG_HOLDING_ID` import usage for GL/AR operations
- Accept `effectiveCompanyId` as a parameter to `approvePayment()` and the batch approval function
- Replace all 11 `NCG_HOLDING_ID` references with the passed-in company ID

**2. `src/components/special-hire/FinanceApprovalWithSignature.tsx`**
- Import `useCompany` from CompanyContext
- Get `getEffectiveCompanyId()` and pass it to `approvePayment(paymentId, notes, effectiveCompanyId)`

**3. `src/components/special-hire/ConfirmedTripsTable.tsx`** (or wherever batch approval is triggered)
- Same pattern: pass `getEffectiveCompanyId()` to the approval calls

### What this does NOT change
- Live data remains untouched — this only ensures future test approvals go to the test company
- No migration needed — this is a code-only fix
- Existing test contamination (if any) would need a separate data cleanup

## Risk Assessment
- **Current risk**: HIGH if anyone has approved Special Hire payments while in test mode
- **Likelihood of past contamination**: Depends on usage — if test mode Special Hire approvals have occurred, live reports are already affected
- **Fix complexity**: LOW — parameter threading through 3 files

