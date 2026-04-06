

# Updated Special Hire Complete Flow Diagram

## What changed since the last diagram
The system has evolved with several new capabilities that need to be reflected:

1. **Auto-Signature system** — documents get automatic signatures (prepared_by, checked_by, approved_by) from configured settings
2. **Auto-email on all signatures complete** — when all 3 signatures are added, the system auto-sends the document via email
3. **Quick Approval button** — one-click approval that triggers auto-signature + PDF regeneration
4. **Final Invoice available without payments** — now works for any confirmed/completed trip regardless of payment status
5. **Sales Receipt for all payment types** — not just advance payments
6. **Payment Reminder flow** — send payment reminder from action column when post-trip adjustment exists
7. **Multiple business scenarios** documented (no payment, advance only, full payment, post-trip adjustment flows)
8. **Document regeneration** — PDFs auto-regenerate when signatures change
9. **Finance Approval modal** — bridges operations documents to finance/GL

## Plan

### Create updated Mermaid diagram at `/mnt/documents/special-hire-ops-finance-flow-v2.mmd`

The diagram will include:
- **Operations Flow** — all scenarios (no payment, advance, full, balance before trip, post-trip adjustment)
- **Document Flow** — Quotation PDF → Sales Receipt(s) → Payment Reminder → Final Invoice, with auto-signature and auto-email
- **Finance Flow** — All 5 JE types (JE-1 through JE-4 + JE-ADJ)
- **Signature & Approval Flow** — auto-signature settings → QuickApproval → PDF regeneration → auto-email
- **Database Tables** — all relevant tables
- **Settlement Formula** — updated with all scenarios
- **Business Scenarios** — the 5 real-world payment patterns the user described

### File
- **Create**: `/mnt/documents/special-hire-ops-finance-flow-v2.mmd`

