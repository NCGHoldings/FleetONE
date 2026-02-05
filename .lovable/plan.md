
# Yutong Tax Invoice Enhancement Plan

## Summary
Add a professional Tax Invoice feature with proper table merging, tax breakdown calculations, and a new "TAX INVOICE" header image. The system will support three invoice types: Direct Invoice, Proforma Invoice, and Tax Invoice.

---

## Requirements Analysis

### 1. Table Merge (Reference: Screenshot 2)
- Product details (MAKE, BUS MODEL, etc.) in merged rows on the left
- QTY, UNIT PRICE, TOTAL columns vertically merged using `rowspan`

### 2. Tax Invoice Features
- New "TAX INVOICE" header image
- Company VAT number display (OUR VAT NO)
- Customer VAT number field
- Tax breakdown calculation:
  - If invoice total = Rs 54,200,000 (inclusive of 18% VAT)
  - Base amount = Total ÷ 1.18 = Rs 45,932,203.39
  - VAT 18% = Total - Base = Rs 8,267,796.61
- Professional blue theme (matching existing corporate style)

### 3. Invoice Type Options
- Direct Customer Invoice (existing)
- Proforma Invoice (existing)
- Tax Invoice (new)

---

## Technical Implementation

### Phase 1: Create Tax Invoice Header Image

**Action**: Copy uploaded header image to public folder

```
Copy: user-uploads://Screenshot_2026-02-05_at_10.19.04.png 
To: public/lovable-uploads/yutong-tax-invoice-header.png
```

---

### Phase 2: Update Data Interface

**File**: `src/lib/yutong-order-invoice-generator.ts`

Add new fields to `YutongOrderInvoiceData` interface:

```typescript
export interface YutongOrderInvoiceData {
  // Existing fields...
  
  // Tax Invoice fields (new)
  is_tax_invoice?: boolean;
  company_vat_number?: string;      // e.g., "101116190 - 7000"
  customer_vat_number?: string;     // e.g., "790701950 - 7000"
  tax_rate?: number;                // e.g., 18
  base_amount?: number;             // Total / 1.18
  vat_amount?: number;              // Total - base_amount
}
```

---

### Phase 3: Update Invoice Type Modal

**File**: `src/components/yutong/YutongInvoiceTypeModal.tsx`

**Changes**:

1. Extend `ProformaInvoiceConfig` interface:
```typescript
export interface ProformaInvoiceConfig {
  invoiceCategory: 'direct_invoice' | 'proforma_invoice' | 'tax_invoice';
  // Existing proforma fields...
  
  // Tax Invoice fields
  isTaxInvoice?: boolean;
  customerVatNumber?: string;
  taxRate?: number;
}
```

2. Add Tax Invoice radio option:
```typescript
<div className="flex items-start space-x-3 p-4 border rounded-lg">
  <RadioGroupItem value="tax_invoice" id="tax" />
  <div className="flex-1">
    <Label htmlFor="tax" className="font-semibold">Tax Invoice</Label>
    <p className="text-sm text-muted-foreground">
      Invoice with VAT breakdown for registered businesses
    </p>
  </div>
</div>
```

3. Add Tax Invoice configuration section:
- Customer VAT Number input field
- Tax rate display (18% fixed)
- Calculated breakdown preview (Base Amount, VAT, Total)

---

### Phase 4: Update HTML Generator

**File**: `src/lib/yutong-order-invoice-generator.ts`

#### 4.1 Fix Table Structure (Merged Cells)

Update the invoice table to use `rowspan` for QTY/UNIT PRICE/TOTAL:

```html
<table class="invoice-table">
  <thead>
    <tr>
      <th colspan="2" style="width:60%;">PRODUCT</th>
      <th style="width:10%;">QTY</th>
      <th style="width:15%;">UNIT PRICE</th>
      <th style="width:15%;">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    <tr class="invoice-body">
      <td>MAKE</td>
      <td>YUTONG</td>
      <td rowspan="8" class="qty">1.00</td>
      <td rowspan="8" class="price">45,932,203.39</td>
      <td rowspan="8" class="total">45,932,203.39</td>
    </tr>
    <tr><td>BUS MODEL</td><td>ZK6128H LUXURY</td></tr>
    <tr><td>SEATING CAPACITY</td><td>51+1+1</td></tr>
    <tr><td>YEAR</td><td>2025</td></tr>
    <tr><td>CONDITION</td><td>BRAND NEW</td></tr>
    <tr><td>FUEL TYPE</td><td>DIESEL</td></tr>
    <tr><td>ENGINE NO</td><td>7525K018541</td></tr>
    <tr><td>CHASIS NUMBER</td><td>LZYTATF60S1042015</td></tr>
  </tbody>
</table>
```

#### 4.2 Conditional Header Based on Invoice Type

```typescript
const headerImage = data.is_tax_invoice 
  ? '/lovable-uploads/yutong-tax-invoice-header.png' 
  : '/lovable-uploads/yutong-invoice-header.png';
```

#### 4.3 VAT Information Section (Tax Invoice Only)

```html
<!-- Shown only for Tax Invoices -->
<div class="vat-info">
  <div class="row">
    <span class="label">OUR VAT NO :</span>
    <span>101116190 - 7000</span>
  </div>
  <div class="row">
    <span class="label">CUSTOMER VAT NO :</span>
    <span>${data.customer_vat_number}</span>
  </div>
</div>
```

#### 4.4 Tax Breakdown in Totals Section

```html
<!-- For Tax Invoice -->
<div class="totals">
  <div class="totals-row">
    <div class="label">SUB TOTAL</div>
    <div class="value">${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
  </div>
  <div class="totals-row">
    <div class="label">VAT 18%</div>
    <div class="value">${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
  </div>
  <div class="totals-row" style="background: #0b2f66; color: white;">
    <div class="label">TOTAL</div>
    <div class="value">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
  </div>
</div>
```

---

### Phase 5: Update Invoice Generator Component

**File**: `src/components/yutong/YutongOrderInvoiceGenerator.tsx`

Add Tax Invoice option to dropdown menu:

```typescript
<DropdownMenuItem onClick={() => handleGenerateInvoice('tax_invoice')}>
  <Receipt className="h-4 w-4 mr-2" />
  <div>
    <div className="font-medium">Tax Invoice</div>
    <div className="text-xs text-muted-foreground">With VAT breakdown</div>
  </div>
</DropdownMenuItem>
```

Update `handleInvoiceTypeConfirm` to calculate tax values:

```typescript
if (config.invoiceCategory === 'tax_invoice') {
  const taxRate = 18;
  const baseAmount = order.total_amount / (1 + taxRate / 100);
  const vatAmount = order.total_amount - baseAmount;
  
  invoiceData.is_tax_invoice = true;
  invoiceData.company_vat_number = '101116190 - 7000';
  invoiceData.customer_vat_number = config.customerVatNumber;
  invoiceData.tax_rate = taxRate;
  invoiceData.base_amount = baseAmount;
  invoiceData.vat_amount = vatAmount;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/yutong-order-invoice-generator.ts` | Add tax invoice fields, fix table rowspan, add tax header, update totals section |
| `src/components/yutong/YutongInvoiceTypeModal.tsx` | Add tax invoice option, customer VAT input, tax calculation preview |
| `src/components/yutong/YutongOrderInvoiceGenerator.tsx` | Add Tax Invoice dropdown option, calculate tax values |
| `public/lovable-uploads/yutong-tax-invoice-header.png` | New header image (copy from upload) |

---

## Visual Comparison

### Current Invoice (Reference)
```
+------------------+---------------+-----+------------+------------+
| PRODUCT          |               | QTY | UNIT PRICE | TOTAL      |
+------------------+---------------+-----+------------+------------+
| MAKE             | YUTONG        |     |            |            |
+------------------+---------------+     |            |            |
| BUS MODEL        | ZK6907H       | 1   | 37,500,000 | 37,500,000 |
+------------------+---------------+     |            |            |
| SEATING CAPACITY | 37+1+1        |     |            |            |
+------------------+---------------+-----+------------+------------+
```

### After Fix (Merged Cells)
```
+------------------+-------------------+------+---------------+---------------+
| PRODUCT          |                   | QTY  | UNIT PRICE    | TOTAL         |
+------------------+-------------------+------+---------------+---------------+
| MAKE             | YUTONG            |      |               |               |
| BUS MODEL        | ZK6128H LUXURY    |      |               |               |
| SEATING CAPACITY | 51+1+1            | 1.00 | 45,932,203.39 | 45,932,203.39 |
| YEAR             | 2025              |      |               |               |
| CONDITION        | BRAND NEW         |      |               |               |
| FUEL TYPE        | DIESEL            |      |               |               |
| ENGINE NO        | 7525K018541       |      |               |               |
| CHASIS NUMBER    | LZYTATF60S1042015 |      |               |               |
+------------------+-------------------+------+---------------+---------------+
```

### Tax Invoice Totals Section
```
+--------------------------------+-----------------+
| AMOUNT IN WORD                 | SUB TOTAL       | 45,932,203.39 |
| (BALANCE PAYABLE)              +-----------------|---------------|
| RUPEES FORTY FIVE MILLION...   | VAT 18%         |  8,267,796.61 |
|                                +-----------------|---------------|
|                                | TOTAL           | 54,200,000.00 |
+--------------------------------+-----------------+---------------+
```

---

## Tax Calculation Logic

```typescript
// Input: Invoice total (VAT inclusive)
const totalIncludingVat = 54200000;
const vatRate = 18; // percent

// Calculate base amount (VAT exclusive)
const baseAmount = totalIncludingVat / (1 + vatRate / 100);
// = 54200000 / 1.18 = 45,932,203.39

// Calculate VAT amount
const vatAmount = totalIncludingVat - baseAmount;
// = 54200000 - 45932203.39 = 8,267,796.61

// Verify
// baseAmount + vatAmount = totalIncludingVat ✓
```

---

## Implementation Priority

| Step | Task | Effort |
|------|------|--------|
| 1 | Copy Tax Invoice header image | 1 min |
| 2 | Update data interface with tax fields | 10 min |
| 3 | Fix table structure with rowspan | 30 min |
| 4 | Add Tax Invoice option to modal | 20 min |
| 5 | Update HTML generator for tax invoice | 30 min |
| 6 | Add Tax Invoice to dropdown menu | 10 min |
| 7 | Test all three invoice types | 15 min |

**Total Estimated: ~2 hours**
