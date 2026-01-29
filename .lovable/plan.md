
# Fix Cash Receipt Header and Amount in Words Format

## Problems Identified

### Issue 1: Wrong Header Image on Cash Receipts
The Yutong Cash Receipt uses the quotation header image which displays "QUOTATION" in the banner instead of "RECEIPT".

**Current State:**
- File: `src/components/yutong/YutongCashReceiptPreview.tsx`
- Uses: `/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png` (Quotation header)

**Solution:**
Create a CSS-based receipt header that matches the branding but says "RECEIPT" instead of relying on the quotation image.

### Issue 2: Amount in Words Uses Lakh/Crore Format
The `numberToWords` function in multiple files uses Indian numbering system (Lakh, Crore) instead of the international Million format.

**Affected Files:**
| File | Current Format | Status |
|------|----------------|--------|
| `src/hooks/useYutongCashReceipts.ts` | Lakh/Crore | Needs fix |
| `src/hooks/useSinotruckCashReceipts.ts` | Lakh/Crore | Needs fix |
| `src/hooks/useLightVehicleCashReceipts.ts` | Million but says "Dollars" | Needs fix |
| `src/lib/number-to-words.ts` | Lakh/Crore | Needs fix |

---

## Solution

### Fix 1: Update All Cash Receipt Headers
Replace the quotation header image with a CSS-based header that says "RECEIPT" for all three vehicle modules.

**Files to Modify:**
- `src/components/yutong/YutongCashReceiptPreview.tsx`
- `src/components/sinotruck/SinotruckCashReceiptPreview.tsx`

### Fix 2: Create Unified Number-to-Words Utility with Million Format

Update all `numberToWords` functions to use the international format:
- Million instead of Lakh
- Billion instead of Crore
- Always "RUPEES ONLY" at the end

**New Algorithm:**
```text
6,000,000 → SIX MILLION RUPEES ONLY
60,000,000 → SIXTY MILLION RUPEES ONLY
1,500,000 → ONE MILLION FIVE HUNDRED THOUSAND RUPEES ONLY
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useYutongCashReceipts.ts` | Update `numberToWords` to use Million format |
| `src/hooks/useSinotruckCashReceipts.ts` | Update `numberToWords` to use Million format |
| `src/hooks/useLightVehicleCashReceipts.ts` | Fix to use RUPEES instead of Dollars, uppercase |
| `src/lib/number-to-words.ts` | Update shared utility to use Million format |
| `src/components/yutong/YutongCashReceiptPreview.tsx` | Replace quotation header with receipt header |
| `src/components/sinotruck/SinotruckCashReceiptPreview.tsx` | Verify receipt header is correct |

---

## Technical Changes

### 1. Updated `numberToWords` Function (All Hooks)

```typescript
export const numberToWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  if (num === 0) return 'ZERO RUPEES ONLY';
  
  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };
  
  let result = '';
  const billion = Math.floor(num / 1000000000);
  const million = Math.floor((num % 1000000000) / 1000000);
  const thousand = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);
  
  if (billion) result += convertHundreds(billion) + 'BILLION ';
  if (million) result += convertHundreds(million) + 'MILLION ';
  if (thousand) result += convertHundreds(thousand) + 'THOUSAND ';
  if (remainder) result += convertHundreds(remainder);
  
  return result.trim() + ' RUPEES ONLY';
};
```

**Examples:**
- 6,000,000 → "SIX MILLION RUPEES ONLY"
- 60,000,000 → "SIXTY MILLION RUPEES ONLY"
- 1,234,567 → "ONE MILLION TWO HUNDRED THIRTY FOUR THOUSAND FIVE HUNDRED SIXTY SEVEN RUPEES ONLY"

### 2. YutongCashReceiptPreview.tsx - Header Change

Replace the quotation image with a CSS-styled receipt header:

```typescript
{/* Header - Receipt specific branding */}
<div className="receipt-header" style={{
  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
  padding: '15px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  <div style={{ 
    color: 'white', 
    fontSize: '28px', 
    fontWeight: 'bold',
    letterSpacing: '3px'
  }}>
    RECEIPT
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
    <img src="/lovable-uploads/ncg-logo.png" alt="NCG Holdings" style={{ height: '50px' }} />
    <img src="/lovable-uploads/yutong-logo.png" alt="Yutong" style={{ height: '40px' }} />
  </div>
</div>
```

Alternatively, we can create a new receipt header image that says "RECEIPT" instead of "QUOTATION" - this would maintain design consistency with the quotation documents.

---

## Expected Outcome

After these fixes:
1. Cash Receipt header will display "RECEIPT" instead of "QUOTATION"
2. Amount in words will show:
   - "SIX MILLION RUPEES ONLY" instead of "SIXTY LAKH RUPEES ONLY"
   - Consistent format across all three vehicle modules (Yutong, Sinotruck, Light Vehicle)

---

## Testing Checklist

1. **Yutong Cash Receipt**
   - Generate a new cash receipt
   - Verify header says "RECEIPT" not "QUOTATION"
   - Verify amount 6,000,000 shows "SIX MILLION RUPEES ONLY"

2. **Sinotruck Cash Receipt**
   - Generate a new cash receipt
   - Verify amount format is in millions

3. **Light Vehicle Cash Receipt**
   - Generate a new cash receipt
   - Verify it says "RUPEES" not "DOLLARS"
   - Verify uppercase format matches other modules
