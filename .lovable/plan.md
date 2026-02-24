

# Fix: Yutong Invoice Professional Layout

## Issues Found

### 1. Orange Proforma Badge is Unprofessional
The proforma invoice shows an orange gradient badge ("Proforma Invoice") floating over the header area at `position: absolute; top: 120px; right: 40px`. This looks jarring and unprofessional on a formal document.

**Fix:** Remove the orange badge entirely. The document is already identified as a proforma by the "PROFORMA NO" label in the metadata section and the "PROFORMA INVOICE NOTICE" box at the bottom. No extra badge is needed.

### 2. Product Table Column Widths are Badly Proportioned
The PRODUCT header spans 55% (`colspan="2"`), but inside the body:
- Label column (MAKE, BUS MODEL, etc.): `width: 45%`
- Value column (YUTONG, C12 Pro, etc.): gets only ~10% (the leftover)

This squeezes the Yutong model name "Yutong C12 Pro ZK6128H" into a tiny space, causing line wrapping and a cramped look.

**Fix:** Redistribute the PRODUCT columns to 25% label / 30% value (matching the Yutong Tax Invoice standard from memory). This gives proper space for both the field names and the vehicle data values.

### 3. Proforma Notice Box Styling
The orange-bordered proforma notice at the bottom uses an emoji warning icon and orange theme. This will be refined to use the blue corporate theme for consistency while keeping it clearly marked as informational.

## Changes

### File: `src/lib/yutong-order-invoice-generator.ts`

**Change 1 -- Remove proforma badge (lines 131-167)**
- Remove the `.proforma-badge` CSS class and the `.proforma-amount-display` class
- Keep `.proforma-info` but restyle it to use the blue corporate theme instead of orange

**Change 2 -- Remove badge HTML (line 678)**
- Remove `${isProforma ? '<div class="proforma-badge">Proforma Invoice</div>' : ''}`

**Change 3 -- Fix table column widths (lines 711-719)**
- Change PRODUCT columns from 55% to keep at 55% but split as:
  - Label td: `width: 25%` (was 45%)
  - Value td: `width: 30%` (was ~10%)
- This matches the corporate standard for Tax Invoices

**Change 4 -- Restyle proforma notice (lines 146-162, 786-793)**
- Change proforma-info background from orange (`#fff7ed`) to light blue (`#e8f6ff`)
- Change border from orange (`#f97316`) to corporate blue (`#0b2f66`)
- Change text color from orange (`#ea580c`, `#9a3412`) to corporate blue
- Replace emoji warning icon with text "PROFORMA INVOICE NOTICE"

