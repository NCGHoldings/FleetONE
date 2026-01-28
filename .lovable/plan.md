
# Sinotruck Full Sales Flow Implementation

## Overview

This plan implements the complete Sinotruck sales document flow matching Yutong and Light Vehicle modules, including:

- Quotation View with Signatures tab
- Invoice Generation (Direct + Proforma)
- Cash Receipts with signatures
- Full document management with PDF generation

---

## Current State Analysis

### What Sinotruck Already Has
- `sinotruck_quotations` table with quotation data
- `sinotruck_quotation_signatures` table for quotation signatures
- `sinotruck_orders` table with order management
- `sinotruck_customer_payments` and `sinotruck_payment_schedules` tables
- `SinotruckPaymentTracking` component with GL integration
- `SinotruckQuotationViewModal` - basic view (no signatures tab)
- `SinotruckQuotationSignatureModal` - signature capture exists
- `SinotruckQuotationPreview` - quotation preview exists

### What's Missing (Compared to Yutong)
1. **Signature Manager** - No `SinotruckSignatureManager` component
2. **Invoice Records Table** - No `sinotruck_invoice_records` table
3. **Invoice Documents Table** - No `sinotruck_invoice_documents` table
4. **Invoice Generator** - Current `SinotruckInvoiceGenerator` only generates quotation PDFs
5. **Order Invoice Generator** - No `SinotruckOrderInvoiceGenerator` component
6. **Cash Receipts** - No `sinotruck_cash_receipts` table or components
7. **Hooks** - No `useSinotruckSignatures`, `useSinotruckOrderInvoiceManagement`, `useSinotruckCashReceipts`
8. **Quotation View Modal** - Missing Tabs for Preview + Signatures

---

## Implementation Plan

### Phase 1: Database Schema (New Tables)

Create migration for:

```text
sinotruck_invoice_records
├── id (UUID)
├── invoice_no (TEXT, UNIQUE)
├── order_id (FK to sinotruck_orders)
├── quotation_id (FK to sinotruck_quotations)
├── invoice_date, invoice_amount
├── status (draft/approved)
├── invoice_category (direct_invoice/proforma_invoice)
├── proforma fields (amount_percentage, finance_company, purpose)
├── approved_by, approved_at
└── timestamps

sinotruck_invoice_documents
├── id (UUID)
├── invoice_record_id (FK)
├── file_name, file_path, file_size
├── document_status
├── invoice_data (JSONB)
└── timestamps

sinotruck_invoice_signatures
├── id (UUID)
├── invoice_record_id (FK)
├── signature_role (prepared_by/approved_by/received_by)
├── signer_name, signature_data, signature_type
├── signed_at, signed_by
└── timestamps

sinotruck_cash_receipts
├── id (UUID)
├── receipt_no (TEXT, UNIQUE)
├── order_id (FK)
├── payment_id (FK)
├── receipt_date, receipt_amount
├── payment_method
├── customer/finance signature data
└── timestamps
```

Also create:
- `generate_sinotruck_invoice_no()` function
- `generate_sinotruck_receipt_no()` function
- RLS policies for all tables
- Performance indexes

---

### Phase 2: Hooks

| Hook | Purpose |
|------|---------|
| `useSinotruckSignatures.ts` | Fetch/save/delete quotation signatures |
| `useSinotruckOrderInvoiceManagement.ts` | Generate, approve, regenerate invoices |
| `useSinotruckCashReceipts.ts` | Create and manage cash receipts |

These will mirror the Yutong hooks with Sinotruck-specific table names.

---

### Phase 3: Invoice Generation Library

Create `src/lib/sinotruck-order-invoice-generator.ts`:
- `SinotruckOrderInvoiceData` interface
- `generateSinotruckOrderInvoiceHTML()` function
- `generateSinotruckOrderInvoicePDF()` function

Template styled for truck sales (similar to Yutong bus invoice).

---

### Phase 4: UI Components

#### 4.1 Update `SinotruckQuotationViewModal`
Add Tabs pattern matching Yutong/Light Vehicle:
- **Preview tab** - Quotation preview
- **Manage Signatures tab** - `SinotruckSignatureManager`

#### 4.2 Create `SinotruckSignatureManager`
Replicate `YutongSignatureManager`:
- Three signature slots: Sales Manager, Approved By, Customer
- Add/Update/Remove signatures
- Connect to `SinotruckQuotationSignatureModal`

#### 4.3 Create `SinotruckOrderInvoiceGenerator`
Replicate `YutongOrderInvoiceGenerator`:
- Vehicle details completion check
- Generate Invoice dropdown (Direct/Proforma)
- Invoice type modal for proforma config
- List existing invoices with View/Download

#### 4.4 Create `SinotruckOrderInvoiceViewModal`
- Preview tab with invoice iframe
- Signatures tab for invoice signatures
- Approve, Regenerate, Download, Email buttons

#### 4.5 Create `SinotruckInvoiceSignatureManager`
For managing invoice signatures (Prepared By, Approved By, Received By).

#### 4.6 Create `SinotruckCashReceiptModal`
Replicate `YutongCashReceiptModal`:
- Cash receipt preview
- Customer and Finance signature options
- PDF download

#### 4.7 Create `SinotruckCashReceiptPreview`
Receipt layout matching company branding.

#### 4.8 Update `EnhancedSinotrukOrderDetailsModal`
- Add Invoice Generator to Documents tab
- Add Cash Receipt generation to Financial tab

---

### Phase 5: Integration Points

1. **Payment Tracking**: Update `SinotruckPaymentTracking` to:
   - Show "Generate Receipt" button for verified payments
   - Link to cash receipt modal

2. **Order Details Modal**: Wire up Documents tab with `SinotruckOrderInvoiceGenerator`

3. **Quotation List**: Ensure "View" action opens updated modal with signatures

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/XXXX_sinotruck_invoice_system.sql` | Database tables, functions, RLS |
| `src/hooks/useSinotruckSignatures.ts` | Quotation signature management |
| `src/hooks/useSinotruckOrderInvoiceManagement.ts` | Invoice CRUD operations |
| `src/hooks/useSinotruckCashReceipts.ts` | Cash receipt management |
| `src/lib/sinotruck-order-invoice-generator.ts` | Invoice HTML/PDF generation |
| `src/components/sinotruck/SinotruckSignatureManager.tsx` | Quotation signature UI |
| `src/components/sinotruck/SinotruckOrderInvoiceGenerator.tsx` | Invoice generation UI |
| `src/components/sinotruck/SinotruckOrderInvoiceViewModal.tsx` | Invoice view with signatures |
| `src/components/sinotruck/SinotruckInvoiceSignatureManager.tsx` | Invoice signature UI |
| `src/components/sinotruck/SinotruckInvoiceTypeModal.tsx` | Direct/Proforma selection |
| `src/components/sinotruck/SinotruckInvoiceDataModal.tsx` | Vehicle data input |
| `src/components/sinotruck/SinotruckCashReceiptModal.tsx` | Receipt modal |
| `src/components/sinotruck/SinotruckCashReceiptPreview.tsx` | Receipt preview |
| `src/components/sinotruck/SinotruckCashReceiptSignatureModal.tsx` | Receipt signatures |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sinotruck/SinotruckQuotationViewModal.tsx` | Add Tabs, Signatures tab |
| `src/components/sinotruck/SinotruckPaymentTracking.tsx` | Add cash receipt generation |
| `src/components/sinotruck/EnhancedSinotrukOrderDetailsModal.tsx` | Wire Documents tab |
| `src/integrations/supabase/types.ts` | Auto-generated after migration |

---

## Document Flow Diagram

```text
QUOTATION FLOW
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Create     │────▶│   View &     │────▶│  Confirm    │
│  Quotation  │     │   Sign       │     │  Order      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Sales Manager    Customer
              Signature        Signature

ORDER + INVOICE FLOW
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Record    │────▶│   Verify     │────▶│  Generate   │
│   Payment   │     │   Payment    │     │   Receipt   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               GL Posted      AR Invoice
                           Created

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Complete   │────▶│  Generate    │────▶│   Approve   │
│  Vehicle    │     │  Invoice     │     │   & Send    │
│  Details    │     │  (Draft)     │     └─────────────┘
└─────────────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Direct Invoice   Proforma Invoice
              (Customer)       (Finance Company)
```

---

## Testing Checklist

After implementation:

1. **Quotation Signatures**
   - Open a Sinotruck quotation
   - Click "Manage Signatures" tab
   - Add Sales Manager, Approved By, Customer signatures
   - Download PDF with signatures embedded

2. **Invoice Generation**
   - Create an order from confirmed quotation
   - Complete vehicle details (engine, chassis, etc.)
   - Generate Direct Invoice - verify PDF
   - Generate Proforma Invoice with finance company details

3. **Invoice Signatures**
   - View generated invoice
   - Add Prepared By, Approved By, Received By signatures
   - Regenerate PDF with signatures
   - Approve invoice

4. **Cash Receipts**
   - Record a payment
   - Verify payment (GL should post)
   - Generate cash receipt
   - Add customer and finance signatures
   - Download receipt PDF

5. **End-to-End Flow**
   - Quotation → Confirm → Order
   - Payment → Verify → GL Entry
   - Complete Details → Generate Invoice
   - Sign → Approve → Send to Customer
