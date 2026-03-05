

# Add Edit & Delete to All Major Accounting Views

## Current State
- **CustomerMasterView** and **VendorMasterView** already have Edit buttons
- **AR Invoices, AP Invoices, Inventory Items, Sales Orders, Delivery Notes, Purchase Orders, Credit Notes, Debit Notes** — only have View/Approve/Pay actions, NO edit or delete
- No `useDeleteARInvoice`, `useDeleteAPInvoice`, `useUpdateARInvoice`, `useUpdateAPInvoice`, `useDeleteItem`, `useUpdateItem` mutation hooks exist

## Plan

### 1. Add Missing Mutation Hooks (`src/hooks/useAccountingMutations.ts`)

Add update and delete mutations for each entity. Delete will only work on `draft` or `cancelled` records (safety rule — posted/paid records cannot be deleted, only cancelled):

- `useUpdateARInvoice` — updates `ar_invoices` by id
- `useDeleteARInvoice` — deletes from `ar_invoices` where status is `draft`/`cancelled`
- `useUpdateAPInvoice` — updates `ap_invoices` by id
- `useDeleteAPInvoice` — deletes from `ap_invoices` where status is `draft`/`cancelled`
- `useUpdateItem` — updates `items` by id
- `useDeleteItem` — deletes from `items` by id
- `useDeleteSalesOrder` — deletes from `sales_orders` where status is `draft`
- `useDeletePurchaseOrder` — deletes from `purchase_orders` where status is `draft`
- `useDeleteARCreditNote` — deletes from `ar_credit_notes`
- `useDeleteAPDebitNote` — deletes from `ap_debit_notes`

### 2. Add Edit & Delete to AR Invoices (`AccountsReceivableView.tsx`)

- Add state: `editingInvoice`, `deleteConfirmId`
- In actions column: add Edit (pencil icon) and Delete (trash icon) buttons
- Edit opens `ARInvoiceForm` pre-filled with invoice data
- Delete shows confirmation dialog, only enabled for `draft`/`cancelled` invoices
- Add `AlertDialog` for delete confirmation

### 3. Add Edit & Delete to AP Invoices (`AccountsPayableView.tsx`)

Same pattern as AR — Edit opens `APInvoiceForm` pre-filled, Delete with confirmation for draft/cancelled only.

### 4. Add Edit & Delete to Inventory (`InventoryView.tsx`)

- Edit opens `ItemForm` pre-filled with item data
- Delete with confirmation

### 5. Add Edit & Delete to Sales Orders (`SalesOrderView.tsx`)

- Edit opens `SalesOrderForm` pre-filled
- Delete for draft orders only

### 6. Add Edit & Delete to Credit/Debit Notes (`ARCreditNotesView.tsx`, `APDebitNotesView.tsx`)

- Add Edit and Delete action buttons to existing action columns

### 7. Add Edit & Delete to Purchase Orders (`PurchaseOrderView.tsx`)

- Add Edit and Delete for draft POs

## Safety Rules
- **Delete** only available for `draft` or `cancelled` status records
- **Edit** disabled for `paid` or `posted` records (read-only after posting)
- All deletes require confirmation dialog
- Toast notifications for success/error

## Files to Change

| File | What |
|---|---|
| `src/hooks/useAccountingMutations.ts` | Add ~10 new update/delete mutation hooks |
| `src/components/accounting/AccountsReceivableView.tsx` | Add Edit + Delete buttons with confirmation |
| `src/components/accounting/AccountsPayableView.tsx` | Add Edit + Delete buttons with confirmation |
| `src/components/accounting/InventoryView.tsx` | Add Edit + Delete buttons with confirmation |
| `src/components/accounting/SalesOrderView.tsx` | Add Edit + Delete buttons with confirmation |
| `src/components/accounting/PurchaseOrderView.tsx` | Add Edit + Delete buttons with confirmation |
| `src/components/accounting/ARCreditNotesView.tsx` | Add Edit + Delete buttons |
| `src/components/accounting/APDebitNotesView.tsx` | Add Edit + Delete buttons |

