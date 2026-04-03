

# Cross-Check: Special Hire Complete Flow MMD vs Actual Code

## Accuracy Assessment

### What the diagram gets RIGHT

1. **Quotation Phase** (Q1-Q4) — Correct. Customer request → create quotation → confirm → PDF generated.

2. **Advance Payment Flow** (Scenario A) — Mostly correct:
   - Confirm advance → Draft sales receipt → Finance approves → GL posted (DR Bank / CR Customer Advance) ✓
   - Sales receipt approved with signatures ✓
   - AR Invoice created ✓ (but **only for full/balance payments**, NOT advance — see issue below)

3. **Full Payment Flow** (Scenario B) — Mostly correct:
   - Full payment uses same GL as advance (DR Bank / CR Customer Advance) ✓
   - AR Invoice + Receipt created ✓

4. **Advance + Balance Flow** (Scenario D) — Correct sequence ✓

5. **GL Posting Summary** — All 4 JE types confirmed in code:
   - DR Bank / CR Customer Advance (advance/full payment) ✓
   - DR Receivable / CR SPH Revenue (invoice sent) ✓
   - DR Advance / CR Receivable (advance application) ✓
   - DR Discount Expense / CR Receivable (discount) ✓
   - Double-posting guard ✓

6. **Post-Trip Adjustment** — Confirmed: separate GL posting (DR Trade Receivable / CR Revenue) exists in `PostTripAdjustmentModal.tsx` ✓

### Issues Found (Diagram Does NOT Match Code)

#### Issue 1: AR Invoice Timing for Advance Payments
- **Diagram says** (A6): AR Invoice created right after advance approval
- **Code says** (`useFinanceApproval.ts` line 154-156): AR Invoice is only created for `isFullPayment || isBalance`, NOT for advance payments
- **Actual behavior**: For advance-only, AR Invoice is created later when the final/balance invoice is sent via `GenerateBalanceInvoiceModal`

#### Issue 2: GL Posting Trigger for Invoice (JE #2)
- **Diagram says** (A12-A13): GL for revenue recognition happens when "Email to Customer" is clicked
- **Code confirms**: This is correct — `GenerateBalanceInvoiceModal.tsx` line 461-471 posts invoice GL only when email is sent. But the diagram's "Email to Customer? → Yes/No" branching is misleading — the GL also posts when downloading, not just emailing (need to verify)

#### Issue 3: Post-Trip Adjustment GL is Missing from Diagram Scenarios
- **Code**: `PostTripAdjustmentModal.tsx` lines 276-302 posts a **separate JE** (DR Trade Receivable / CR Revenue) for post-trip adjustments
- **Diagram**: Shows post-trip adjustments feed into the final invoice amount, but does NOT show this as a separate GL posting event
- **The GL Summary box mentions it indirectly** but the scenario flows don't include it

#### Issue 4: Scenario C (No Payment) — Oversimplified
- **Diagram**: Shows a linear flow with "Payment Reminder" feature
- **Code**: Payment Reminder exists as a document type but the flow is essentially the same as advance/balance — customer pays, finance approves, GL posts. No separate "no payment" path really exists in the code.

#### Issue 5: Full Payment GL Entry Label
- **Diagram** (B4): Says "DR Bank / CR Customer Advance (AR Flow)"
- **Code** (`useSpecialHireFinance.ts` line 151-153): Confirms full payments use same advance flow (DR Bank / CR Customer Advance), then AR Invoice handles revenue recognition later. The label is correct but could be clearer.

### Summary of Required Corrections

| # | Diagram Element | Current | Should Be |
|---|----------------|---------|-----------|
| 1 | A6 (Advance → AR Invoice) | AR Invoice Created right after advance | AR Invoice created later at balance/final invoice stage |
| 2 | Post-trip GL | Not shown as separate JE in flow | Add JE step: DR Receivable / CR Revenue (adjustment amount) |
| 3 | Scenario C | Separate "no payment" path | Simplify — merges into advance/balance flow once payment happens |

### Recommendation

Update the `.mmd` diagram to fix the 3 issues above. The biggest inaccuracy is **Issue 1** — the diagram shows AR Invoice being created immediately after advance approval, but in code it only happens when a full/balance payment is approved or when the final invoice is sent.

