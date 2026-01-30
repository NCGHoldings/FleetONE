
# Yutong Cash Receipt Update - Header Image & No Refunds Seal

## Summary

This plan updates the Yutong Cash Receipt to:
1. Replace the current CSS-based header with the new professional header image
2. Add the "NO REFUNDS" company seal below the receipt table

---

## Changes Required

### 1. Copy Uploaded Images to Project

**Files to Copy**:
| Source | Destination | Purpose |
|--------|-------------|---------|
| `user-uploads://Screenshot_2026-01-30_at_15.57.44.png` | `public/lovable-uploads/yutong-cash-receipt-header.png` | Cash Receipt header banner |
| `user-uploads://photo_2026-01-30_15-58-08.jpg` | `public/lovable-uploads/ncg-no-refunds-seal.png` | No Refunds company seal |

---

### 2. Update YutongCashReceiptPreview.tsx

**File**: `src/components/yutong/YutongCashReceiptPreview.tsx`

**Change 1: Replace CSS Header with Image** (Lines 118-154)

Current implementation uses inline CSS gradient with logos. Replace with the uploaded header image:

```tsx
// Replace this CSS-based header:
<div className="receipt-header" style={{
  background: 'linear-gradient(135deg, #003366 0%, #0055a5 100%)',
  padding: '15px 25px',
  display: 'flex',
  ...
}}>
  {/* Multiple elements: logos, text, etc. */}
</div>

// With single header image:
<div className="receipt-header">
  <img 
    src="/lovable-uploads/yutong-cash-receipt-header.png" 
    alt="NCG Holdings - Cash Receipt" 
    style={{ 
      width: '100%', 
      height: 'auto', 
      display: 'block' 
    }}
  />
</div>
```

**Change 2: Remove "CASH RECEIPT" Underlined Title** (Lines 158-167)

Since the header image already contains "CASH RECEIPT" text, remove the duplicate title:

```tsx
// Remove this block:
<div style={{ 
  textAlign: 'center', 
  fontSize: '24px', 
  fontWeight: 'bold', 
  color: '#003366',
  marginBottom: '20px',
  textDecoration: 'underline'
}}>
  CASH RECEIPT
</div>
```

**Change 3: Add "NO REFUNDS" Seal After Table** (After Line 235)

Add the seal image after the receipt table and before the signature section:

```tsx
// After closing </table> tag, add:
<div style={{ 
  display: 'flex', 
  justifyContent: 'flex-end', 
  marginTop: '15px',
  marginBottom: '10px'
}}>
  <img 
    src="/lovable-uploads/ncg-no-refunds-seal.png" 
    alt="No Refunds - NCG Holdings" 
    style={{ 
      width: '120px', 
      height: 'auto', 
      opacity: 0.85 
    }}
  />
</div>
```

---

### 3. Update Page Styles for Image Header

Update the CSS in `pageStyles` to handle the new image-based header properly:

```css
.receipt-header {
  margin-bottom: 0; /* Remove extra margin since image has its own spacing */
}
.receipt-header img {
  width: 100%;
  height: auto;
  display: block;
}
```

---

## Visual Layout After Changes

```text
┌──────────────────────────────────────────────────────────┐
│  [CASH RECEIPT HEADER IMAGE - Full Width]                │
│  ┌──────────────────────────────────────────────────────┐│
│  │ CASH RECEIPT | NCG Holdings | YUTONG logos           ││
│  └──────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────┤
│  CUSTOMER: O B Perera          RECEIPT NO: NCGYTQ-...    │
│  ADDRESS: ...                  QUOTATION NO: YTQ-...     │
│  CONTACT: ...                  MODE OF PAYMENT: [...]    │
│  DATE: 29/01/2026                                        │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐│
│  │ DESCRIPTION                      │ TOTAL             ││
│  ├──────────────────────────────────┼───────────────────┤│
│  │ ADVANCE PAYMENT FOR 1 UNIT...    │ LKR 6,000,000     ││
│  ├──────────────────────────────────┴───────────────────┤│
│  │ AMOUNT IN WORDS: SIX MILLION RUPEES ONLY             ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│                             ┌─────────────────────────┐  │
│                             │  NO REFUNDS             │  │
│                             │  NCG HOLDINGS           │  │
│                             │  (PRIVATE) LIMITED      │  │
│                             └─────────────────────────┘  │
│                                   [Small Seal Image]     │
├──────────────────────────────────────────────────────────┤
│  _______________          DATE:          _______________ │
│    Customer           29/01/2026       Finance Dept      │
├──────────────────────────────────────────────────────────┤
│  📞 +94 77 766 5501  📍 Address  ✉️ info@yutonglankabus.lk│
└──────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `public/lovable-uploads/yutong-cash-receipt-header.png` | Create (copy from upload) |
| `public/lovable-uploads/ncg-no-refunds-seal.png` | Create (copy from upload) |
| `src/components/yutong/YutongCashReceiptPreview.tsx` | Modify (header image, seal, remove duplicate title) |

---

## Technical Notes

1. **PDF Generation Compatibility**: The images will be captured correctly by `html2canvas` since they use direct `src` paths to `public/lovable-uploads/`.

2. **Image Sizing**:
   - Header: Full-width (`width: 100%`) to match container
   - Seal: Small size (`width: 120px`) positioned right-aligned below the table

3. **Opacity**: The seal uses `opacity: 0.85` to give a subtle "stamped" appearance without overwhelming the document.

4. **Consistency**: This approach aligns with how `yutong-invoice-header.png` is used in the invoice generator.
