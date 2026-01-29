
# Fix Warranty Terms & Missing Fields in Quotation Preview

## Problem Identified

The user entered warranty terms in the quotation edit form, but they are **NOT appearing** in the quotation preview/PDF. This is because:

1. **Warranty Terms**: Field exists in database and form but is NOT rendered in the preview template
2. **Delivery Timeline**: Same issue - field exists but not rendered
3. **Payment Terms**: Shows hardcoded text, but custom terms from form are not fully utilized

This affects both **Yutong** and **Light Vehicle** quotation previews.

---

## Solution

Add a dedicated "Custom Terms" section on **Page 2** of the quotation (after the hardcoded Terms & Conditions), displaying:

1. **Warranty Terms** (if entered)
2. **Delivery Timeline** (if entered) 
3. **Payment Terms** (if custom terms entered)

This section will appear between the standard Terms & Conditions and the Customer Acceptance section.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/yutong/YutongQuotationPreview.tsx` | Add Warranty Terms & Custom Terms section after T&C |
| `src/components/lightvehicle/LightVehicleQuotationPreview.tsx` | Add same section for consistency |

---

## Implementation Details

### For Yutong Quotation Preview

Add a new section on Page 2, after line 926 (after the last T&C paragraph), before the signatures:

```text
{/* Custom Terms Section - Warranty, Delivery, Payment */}
{(quotation.warranty_terms || quotation.delivery_timeline || quotation.payment_terms) && (
  <div style={{ 
    marginTop: "20px", 
    padding: "15px", 
    border: "2px solid #003366", 
    borderRadius: "8px", 
    background: "#f8f9fa" 
  }}>
    <h4 style={{ 
      color: "#003366", 
      marginBottom: "10px", 
      fontSize: "13px", 
      fontWeight: "bold",
      borderBottom: "1px solid #003366",
      paddingBottom: "5px"
    }}>
      ADDITIONAL TERMS
    </h4>
    
    {quotation.warranty_terms && (
      <div style={{ marginBottom: "10px" }}>
        <b style={{ color: "#003366" }}>WARRANTY TERMS:</b>
        <p style={{ margin: "5px 0 0 0", whiteSpace: "pre-line", fontSize: "11px" }}>
          {quotation.warranty_terms}
        </p>
      </div>
    )}
    
    {quotation.delivery_timeline && (
      <div style={{ marginBottom: "10px" }}>
        <b style={{ color: "#003366" }}>DELIVERY TIMELINE:</b>
        <p style={{ margin: "5px 0 0 0", fontSize: "11px" }}>
          {quotation.delivery_timeline}
        </p>
      </div>
    )}
    
    {quotation.payment_terms && (
      <div style={{ marginBottom: "0" }}>
        <b style={{ color: "#003366" }}>PAYMENT TERMS:</b>
        <p style={{ margin: "5px 0 0 0", whiteSpace: "pre-line", fontSize: "11px" }}>
          {quotation.payment_terms}
        </p>
      </div>
    )}
  </div>
)}
```

### For Light Vehicle Quotation Preview

Add the same section with Light Vehicle branding colors (blue: `#1e40af`).

---

## Expected Result

After the fix, when a user enters warranty terms like:
```
Engine and Gearbox - 3 years or 300,000km (whichever comes first)
Wearable Parts - 1 month
Tires - 40,000km
Body and Paint - 5 years
```

The quotation will display a dedicated **"ADDITIONAL TERMS"** box on Page 2 containing:
- **WARRANTY TERMS**: The entered warranty information
- **DELIVERY TIMELINE**: Custom delivery estimate (if entered)
- **PAYMENT TERMS**: Custom payment conditions (if entered)

This box will appear after the standard Terms & Conditions and before the signature area.

---

## Visual Layout (Page 2)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     [QUOTATION HEADER]                          │
│                  QUOTATION NO: YUT-xxxx - Terms & Conditions    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Terms & Conditions                                             │
│  ──────────────────                                             │
│  1. Payment & Order Confirmation: ...                           │
│  2. Delivery Timeline: ...                                      │
│  3. Customisations: ...                                         │
│  ... (10 standard terms)                                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ADDITIONAL TERMS                                          │  │ ← NEW
│  │ ─────────────────                                         │  │
│  │ WARRANTY TERMS:                                           │  │
│  │ Engine and Gearbox - 3 years or 300,000km                 │  │
│  │ Wearable Parts - 1 month                                  │  │
│  │ Tires - 40,000km                                          │  │
│  │ Body and Paint - 5 years                                  │  │
│  │                                                           │  │
│  │ DELIVERY TIMELINE: 3-4 months                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Signatures: Sales Manager | Approved By | Customer]           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📞 Contact  |  📍 Address  |  ✉️ Email                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

- Uses `whiteSpace: "pre-line"` to preserve line breaks entered by user
- Only displays section if at least one custom term is entered
- Consistent styling with existing quotation theme (Yutong = blue #003366, Light Vehicle = blue #1e40af)
- Positioned after hardcoded T&C but before signatures for proper document flow
