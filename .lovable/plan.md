
# Create Comprehensive Yutong Sales Complete Flow Diagram

## What to build
A detailed Mermaid diagram (like the Special Hire one) covering the full Yutong bus sales lifecycle from quotation to settlement, including operations, finance, documents, and database tables.

## Flow sections to include

### 1. Operations Flow
- Customer Inquiry → Quotation Created → Convert to Order (with payment schedule: Cash 10/40/50, Lease 20/80)
- Supplier Management → Shipment/Logistics → Customs → Processing → RMV → Delivery
- Payment recording (advance, interim, balance)
- Invoice generation (PI skips AR/GL, CI/TI create draft AR)
- Invoice approval (triggers revenue recognition GL)

### 2. Finance Flow — Journal Entries
- **JE-1**: Advance/Interim Payment → DR Bank / CR Customer Advance (22303001)
- **JE-2**: Invoice Approval (Revenue Recognition) → DR Trade Receivable (12201001) / CR Sales Revenue (41101001) + CR VAT Output (22302001)
- **JE-3**: Advance Application (auto on approval) → DR Customer Advance (22303001) / CR Trade Receivable (12201001)
- **JE-4**: Balance Payment → DR Bank / CR Trade Receivable (12201001)
- **JE-5**: Full Payment (no invoice) → DR Bank / CR Sales Revenue (41101001)
- Proforma Invoice explicitly excluded from AR/GL

### 3. Documents Generated
- Quotation PDF, Proforma Invoice, Customer Invoice, Tax Invoice, Cash Receipts, Delivery Orders

### 4. Database Tables
- yutong_quotations, yutong_orders, yutong_customer_payments, yutong_payment_schedules, yutong_invoice_records, yutong_invoice_documents, yutong_cash_receipts, yutong_delivery_orders, finance_customers, ar_invoices, journal_entries

### 5. AR Integration
- Draft AR at invoice generation (CI/TI only)
- Status update on approval
- Balance payments create AR Receipts
- Duplicate prevention guard

### 6. Settlement Verification
- Trade Receivable = Invoice - Advance Applied - Balance Paid = 0
- Customer Advance = Advance In - Applied = 0
- source_module: yutong_sales, business_unit_code: YUT

## File to create
- `/mnt/documents/Yutong_Complete_Sales_Flow.mmd` — comprehensive Mermaid diagram

## No code changes needed
This is a documentation artifact only.
