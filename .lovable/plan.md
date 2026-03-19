

# Fix Remaining Text Spacing in Special Hire Quotation PDF

## Problem
The previous fix applied `\u00A0` to labels and headers but missed large blocks of body text in the **Extra Charges** and **Terms & Conditions** sections. These sections contain multi-word sentences with regular spaces that `html2canvas` collapses during PDF capture, causing words to merge.

## Solution
Apply `whiteSpace: "pre-wrap"` directly on every text container `div`/`span` that holds body copy (not just the page-level container), and convert critical multi-word phrases to use `\u00A0` in the Extra Charges and T&C sections.

### File: `src/components/special-hire/QuotationPreview.tsx`

**1. Extra Charges section (lines 989–1028)**
- Add inline `style={{ whiteSpace: "pre-wrap" }}` to the text container div at line 989
- Replace regular spaces with `\u00A0` in:
  - "Exceeding Per Kilometer will be charged Rs"
  - "Exceeding per hour will be charged Rs"
  - "Overnight charge per day"
  - "Additional Distance Charges"
  - "Additional {distance} km: Rs"

**2. Terms & Conditions section (lines 1088–1140)**
- Add inline `style={{ whiteSpace: "pre-wrap" }}` to the text container div at line 1088
- Replace regular spaces with `\u00A0` in key phrases:
  - "Upon confirmation of hire"
  - "Cancellation Policy"
  - "Excess Mileage"
  - "Garbage Penalty (per bus)"
  - "Damage Policy"
  - "Customer Responsibilities"
  - All sentence text between `<br />` tags

**3. Footer text (lines 1045–1047 and 1144–1146)**
- Replace "For more information call" with `\u00A0`-separated version
- Replace "All Rights Reserved" similarly

**4. Route Details section (lines 960–983)**
- Apply `\u00A0` to "Start:", "Stop {n}:", "End:" labels and location text containers

This ensures every text element that `html2canvas` captures has explicit whitespace preservation at the element level, not just inherited from a parent container.

