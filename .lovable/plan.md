
# Light Vehicle Full Sales Flow Implementation

## Overview

This plan implements the complete Light Vehicle sales document flow matching Yutong and Sinotruck modules, including:

- Enhanced Order Details Modal with tabs
- Invoice Generation (Direct + Proforma)
- Cash Receipts with signatures
- Full document management with PDF generation
- Quotation-to-Order conversion flow

---

## Current State Analysis

### What Light Vehicle Already Has
- `lightvehicle_quotations` table with quotation data
- `lightvehicle_quotation_signatures` table for quotation signatures
- `lightvehicle_orders` table with order management
- `lightvehicle_customer_payments` and `lightvehicle_payment_schedules` tables
- `lightvehicle_invoice_records`, `lightvehicle_invoice_documents`, `lightvehicle_invoice_signatures` tables (basic structure)
- `LightVehicleQuotationViewModal` with Tabs for Preview + Signatures
- `LightVehicleSignatureManager` component for quotation signatures
- `LightVehiclePaymentTracking` component with GL integration

### What's Missing (Compared to Yutong)
1. **Cash Receipts Table** - No `lightvehicle_cash_receipts` table
2. **Invoice Proforma Fields** - Missing `invoice_category`, `proforma_amount`, `finance_company` columns
3. **Invoice Document Storage** - Missing `file_path`, `document_status` columns
4. **Order Details Modal** - No enhanced modal with Documents/Financial tabs
5. **Order Invoice Generator** - No `LightVehicleOrderInvoiceGenerator` component
6. **Invoice View Modal** - No `LightVehicleOrderInvoiceViewModal`
7. **Hooks** - Missing `useLightVehicleOrderInvoiceManagement`, `useLightVehicleCashReceipts`, `useLightVehicleInvoiceSignatures`
8. **PDF Generator Library** - No `lightvehicle-order-invoice-generator.ts`

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Create Cash Receipts Table
```text
lightvehicle_cash_receipts
├── id (UUID)
├── order_id (FK to lightvehicle_orders)
├── payment_id (FK to lightvehicle_customer_payments)
├── receipt_no (TEXT, UNIQUE)
├── receipt_date, amount, amount_in_words
├── payment_method, product_description
├── quotation_no, customer_name, customer_address, customer_contact
├── customer_signature_data/type/signed_at/signer_name
├── finance_signature_data/type/signed_at/signer_name
├── pdf_url, status
└── timestamps
```

#### 1.2 Enhance Invoice Records Table
Add columns:
- `invoice_category` (direct_invoice/proforma_invoice)
- `proforma_amount_percentage`
- `proforma_amount`
- `finance_company_name`
- `finance_company_address`
- `proforma_purpose`
- `quotation_id` (FK)
- `approved_by`, `approved_at`

#### 1.3 Enhance Invoice Documents Table
Add columns:
- `file_path`
- `document_status` (draft/approved)

#### 1.4 Create Functions and Policies
- `generate_lightvehicle_invoice_no()` function
- `generate_lightvehicle_receipt_no()` function
- RLS policies for new table
- Storage bucket for invoices

---

### Phase 2: Hooks

| Hook | Purpose |
|------|---------|
| `useLightVehicleOrderInvoiceManagement.ts` | Generate, approve, regenerate invoices |
| `useLightVehicleCashReceipts.ts` | Create and manage cash receipts |
| `useLightVehicleInvoiceSignatures.ts` | Manage invoice signatures |

---

### Phase 3: PDF Generation Library

Create `src/lib/lightvehicle-order-invoice-generator.ts`:
- `LightVehicleOrderInvoiceData` interface
- `generateLightVehicleOrderInvoiceHTML()` function
- `generateLightVehicleOrderInvoicePDF()` function

Template styled with blue/brown theme matching Light Vehicle branding.

---

### Phase 4: UI Components

#### 4.1 Create `EnhancedLightVehicleOrderDetailsModal`
Full tabbed order details modal:
- **Overview tab** - Order summary, customer details, vehicle info
- **Financial tab** - `LightVehiclePaymentTracking` + Receipt generation
- **Documents tab** - `LightVehicleOrderInvoiceGenerator`
- **Progress tab** - Order phases and milestones

#### 4.2 Create `LightVehicleOrderInvoiceGenerator`
Replicate `YutongOrderInvoiceGenerator`:
- Vehicle details completion check
- Generate Invoice dropdown (Direct/Proforma)
- Invoice type modal for proforma config
- List existing invoices with View/Download

#### 4.3 Create `LightVehicleInvoiceTypeModal`
For selecting invoice type (Direct Customer / Proforma for Finance).

#### 4.4 Create `LightVehicleInvoiceDataModal`
For completing vehicle details (engine/chassis numbers, etc.) before invoice generation.

#### 4.5 Create `LightVehicleOrderInvoiceViewModal`
- Preview tab with invoice iframe
- Signatures tab for invoice signatures
- Approve, Regenerate, Download, Email buttons

#### 4.6 Create `LightVehicleOrderInvoicePreview`
Invoice preview component for iframe rendering.

#### 4.7 Create `LightVehicleInvoiceSignatureManager`
For managing invoice signatures (Prepared By, Approved By, Received By).

#### 4.8 Create `LightVehicleInvoiceSignatureModal`
Modal for capturing invoice signatures.

#### 4.9 Create `LightVehicleCashReceiptModal`
- Cash receipt preview
- Customer and Finance signature options
- PDF download

#### 4.10 Create `LightVehicleCashReceiptPreview`
Receipt layout with blue Light Vehicle branding.

#### 4.11 Create `LightVehicleCashReceiptSignatureModal`
For capturing receipt signatures.

#### 4.12 Update `LightVehicleOrdersList`
- Wire up View button to open `EnhancedLightVehicleOrderDetailsModal`
- Add order conversion from quotation flow

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/XXXX_lightvehicle_invoice_system.sql` | Database tables, columns, functions, RLS |
| `src/hooks/useLightVehicleOrderInvoiceManagement.ts` | Invoice CRUD operations |
| `src/hooks/useLightVehicleCashReceipts.ts` | Cash receipt management |
| `src/hooks/useLightVehicleInvoiceSignatures.ts` | Invoice signature management |
| `src/lib/lightvehicle-order-invoice-generator.ts` | Invoice HTML/PDF generation |
| `src/components/lightvehicle/EnhancedLightVehicleOrderDetailsModal.tsx` | Tabbed order details |
| `src/components/lightvehicle/LightVehicleOrderInvoiceGenerator.tsx` | Invoice generation UI |
| `src/components/lightvehicle/LightVehicleInvoiceTypeModal.tsx` | Direct/Proforma selection |
| `src/components/lightvehicle/LightVehicleInvoiceDataModal.tsx` | Vehicle data input |
| `src/components/lightvehicle/LightVehicleOrderInvoiceViewModal.tsx` | Invoice view with signatures |
| `src/components/lightvehicle/LightVehicleOrderInvoicePreview.tsx` | Invoice preview component |
| `src/components/lightvehicle/LightVehicleInvoiceSignatureManager.tsx` | Invoice signature UI |
| `src/components/lightvehicle/LightVehicleInvoiceSignatureModal.tsx` | Invoice signature capture |
| `src/components/lightvehicle/LightVehicleCashReceiptModal.tsx` | Receipt modal |
| `src/components/lightvehicle/LightVehicleCashReceiptPreview.tsx` | Receipt preview |
| `src/components/lightvehicle/LightVehicleCashReceiptSignatureModal.tsx` | Receipt signatures |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lightvehicle/LightVehicleOrdersList.tsx` | Add modal trigger, order details |
| `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` | Add cash receipt generation |
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
   - Open a Light Vehicle quotation
   - Click "Manage Signatures" tab
   - Add Sales Manager, Approved By, Customer signatures
   - Download PDF with signatures embedded

2. **Order Creation from Quotation**
   - Confirm a quotation
   - Verify order is created with linked quotation
   - Open order details modal

3. **Invoice Generation**
   - Open order details, go to Documents tab
   - Complete vehicle details (if needed)
   - Generate Direct Invoice - verify PDF
   - Generate Proforma Invoice with finance company details

4. **Invoice Signatures**
   - View generated invoice
   - Add Prepared By, Approved By, Received By signatures
   - Regenerate PDF with signatures
   - Approve invoice

5. **Cash Receipts**
   - Record a payment
   - Verify payment (GL should post)
   - Generate cash receipt
   - Add customer and finance signatures
   - Download receipt PDF

6. **End-to-End Flow**
   - Quotation → Confirm → Order
   - Payment → Verify → GL Entry
   - Complete Details → Generate Invoice
   - Sign → Approve → Send to Customer
