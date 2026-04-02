

# Special Hire — Complete Operations & Finance Flow Diagram

## What to build
A detailed Mermaid diagram saved to `/mnt/documents/` showing the full Special Hire lifecycle from customer inquiry through to final GL settlement, with every journal entry and document listed.

## Diagram content

### Operations Flow
1. Customer Inquiry (Public Form / Manual)
2. Quotation Created (versioning, bank snapshot, terms)
3. Customer Confirmation
4. Advance Payment (optional)
5. Trip Assignment (driver, bus, route)
6. Trip Execution
7. Post-Trip Adjustments (extra KM, expenses, waiting)
8. Final Invoice / AR Invoice generation
9. Balance Payment
10. Settlement & Closure

### Finance Flow (4 Journal Entries)
| Step | Journal Entry | Debit | Credit |
|------|--------------|-------|--------|
| 1. Advance Payment received | JE-1 | Bank (13001011) | Customer Advance (22303001) |
| 2. AR Invoice approved | JE-2 | Trade Receivable (12201001) | SPH Revenue (41103002/3) + VAT Output (22302001) |
| 3. Balance Payment received | JE-3 | Bank (13001011) | Trade Receivable (12201001) |
| 4. Advance Application (auto) | JE-4 | Customer Advance (22303001) | Trade Receivable (12201001) |

### Documents Generated
- Quotation PDF (with bank snapshot)
- Sales Receipt (advance)
- AR Invoice PDF
- Final Invoice PDF
- Balance Receipt
- Payment Voucher (if applicable)

### Database Tables Hit
- `special_hire_submissions`
- `special_hire_quotations`
- `special_hire_payments`
- `special_hire_invoices`
- `special_hire_trip_expenses`
- `special_hire_post_trip_adjustments`
- `finance_customers`
- `ar_invoices` + `ar_invoice_items`
- `journal_entries` + `journal_entry_lines`
- `special_hire_finance_settings`

## Output
Single comprehensive Mermaid `.mmd` file at `/mnt/documents/special-hire-ops-finance-flow.mmd`

## No code changes needed
This is a documentation/visualization task only.

