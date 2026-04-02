

# Add Related Journal Entries to AR/AP Invoice, Receipt & Payment Detail Views

## What to build
A reusable "Related Journal Entries" section that appears inside the detail dialogs for AR Invoices, AP Invoices, AR Receipts, and AP Payments. When you open any of these records, you'll see all linked JEs — the invoice's own JE, plus receipts/payments JEs linked to that invoice.

## How it works

### New reusable component: `RelatedJournalEntries.tsx`
Create `src/components/accounting/shared/RelatedJournalEntries.tsx`

Props: `{ sourceId: string; sourceType: "ar_invoice" | "ap_invoice" | "ar_receipt" | "ap_payment" }`

Fetches related JEs based on source type:
- **AR Invoice**: Fetch the invoice's own `journal_entry_id`, plus all `ar_receipts` for that invoice → their `journal_entry_id`s → fetch all those journal entries with lines
- **AP Invoice**: Same pattern — invoice JE + all `ap_payments` allocated to it → their JEs
- **AR Receipt**: Fetch the receipt's own `journal_entry_id`
- **AP Payment**: Fetch the payment's own `journal_entry_id`

Renders a compact table per JE showing: entry number, date, status badge, and a mini debit/credit lines table. Clicking a JE opens the full `JournalEntryDetailDialog`.

### Integrate into 4 existing views

**1. `AccountsReceivableView.tsx`** (Invoice Detail Dialog, ~line 438)
- After the Notes section, add `<RelatedJournalEntries sourceId={viewInvoice.id} sourceType="ar_invoice" />`

**2. `AccountsPayableView.tsx`** (Invoice Detail Dialog)
- Same placement in the AP invoice detail dialog

**3. `ARReceiptsView.tsx`** (Receipt row action or detail)
- Add a detail dialog (currently missing) or enhance existing Eye button to show receipt details + `<RelatedJournalEntries sourceId={receipt.id} sourceType="ar_receipt" />`

**4. `APPaymentsView.tsx`** (Payment row action or detail)
- Same — add `<RelatedJournalEntries sourceId={payment.id} sourceType="ap_payment" />`

## Component design

```text
┌─────────────────────────────────────┐
│ 📋 Related Journal Entries          │
├─────────────────────────────────────┤
│ JE-20260402-22D2  │ Apr 02  │ POSTED│
│   DR Trade Receivable    500,000    │
│   CR Sales Revenue       500,000    │
├─────────────────────────────────────┤
│ JE-20260405-A1B2  │ Apr 05  │ POSTED│
│   DR Bank (Sampath)      500,000    │
│   CR Trade Receivable    500,000    │
│   (Receipt: REC-2026-001)           │
└─────────────────────────────────────┘
```

Each JE row is clickable → opens `JournalEntryDetailDialog` for full details including reversal links.

## Files to create/modify
- **Create**: `src/components/accounting/shared/RelatedJournalEntries.tsx` — reusable component
- **Modify**: `src/components/accounting/AccountsReceivableView.tsx` — add to invoice detail dialog
- **Modify**: `src/components/accounting/AccountsPayableView.tsx` — add to invoice detail dialog
- **Modify**: `src/components/accounting/ARReceiptsView.tsx` — add detail dialog with JE section
- **Modify**: `src/components/accounting/APPaymentsView.tsx` — add detail dialog with JE section

## No database changes needed
All data already exists — `journal_entry_id` is on all 4 tables, and `journal_entries` + `journal_entry_lines` have the line details.

