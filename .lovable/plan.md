

# Fix Yutong Invoice - Product Column Width & Layout

## Issues Identified

### 1. Product Column Width Problem
Currently in the table:
- Label column (MAKE, BUS MODEL, etc.): **45% of total table width** 
- Value column (YUTONG, ZK6907H, etc.): **Only ~10% remaining** (55% - 45%)
- This makes the data area too narrow and hard to read

### 2. Expected Layout (Reference Image)
The reference shows a balanced split:
- Product Label: ~25% of total width
- Product Value: ~30% of total width  
- QTY: ~10%
- UNIT PRICE: ~17%
- TOTAL: ~18%

### 3. Signatures Location
Confirmed: Signatures are correctly on **Page 2 only** (lines 880-935). The user may be seeing them due to PDF page overflow.

---

## Technical Changes

### File: `src/lib/yutong-order-invoice-generator.ts`

### Fix 1: Update Table Column Widths

**Current (Wrong):**
```html
<th colspan="2" style="width:55%;">PRODUCT</th>
<th style="width:10%;">QTY</th>
<th style="width:17%;">UNIT PRICE</th>
<th style="width:18%;">TOTAL</th>

<td style="font-weight: 700; width: 45%;">MAKE</td>  <!-- TOO WIDE -->
<td>${data.make}</td>                                <!-- TOO NARROW -->
```

**Fixed (Correct):**
```html
<th colspan="2" style="width:55%;">PRODUCT</th>
<th style="width:10%;">QTY</th>
<th style="width:17%;">UNIT PRICE</th>
<th style="width:18%;">TOTAL</th>

<td style="font-weight: 700; width: 25%;">MAKE</td>  <!-- REDUCED -->
<td style="width: 30%;">${data.make}</td>            <!-- EXPLICIT WIDTH -->
```

### Fix 2: Update All Product Rows (Lines 715-749)

Change every label cell from `width: 45%` to `width: 25%`:

```html
<tr class="invoice-body">
  <td style="font-weight: 700; width: 25%;">MAKE</td>
  <td style="width: 30%;">${data.make}</td>
  <td rowspan="8" class="qty merged-cell">...</td>
  <td rowspan="8" class="price merged-cell">...</td>
  <td rowspan="8" class="total merged-cell">...</td>
</tr>
<tr class="invoice-body">
  <td style="font-weight: 700; width: 25%;">BUS MODEL</td>
  <td style="width: 30%;">${data.bus_model}</td>
</tr>
<!-- Same for all 8 rows -->
```

### Fix 3: Add CSS for Better Column Separation

Add visual border/styling to clearly separate the product columns:

```css
.invoice-body td:first-child {
  width: 25%;
  font-weight: 700;
  border-right: 1px solid #0b2f66;
  background: #d6eefc;
}

.invoice-body td:nth-child(2) {
  width: 30%;
  background: #e8f6ff;
}
```

---

## Visual Comparison

### Before (Current)
```
+---------------------------+-------+------+--------------+--------------+
| PRODUCT (55%)                     | QTY  | UNIT PRICE   | TOTAL        |
+---------------------------+-------+------+--------------+--------------+
| MAKE (45%)           | YUTONG(10%) |      |              |              |
| BUS MODEL            | Yutong C9   | 1.00 | 37,500,000   | 37,500,000   |
| (text gets cut off)  | (cramped)   |      |              |              |
+---------------------------+-------+------+--------------+--------------+
```

### After (Fixed)
```
+-------------------+-------------------+------+--------------+--------------+
| PRODUCT (55%)                         | QTY  | UNIT PRICE   | TOTAL        |
+-----------+---------------------------+------+--------------+--------------+
| MAKE (25%)| YUTONG (30%)              |      |              |              |
| BUS MODEL | ZK6907H LUXURY            | 1.00 | 37,500,000   | 37,500,000   |
| (readable)| (has proper space)        |      |              |              |
+-----------+---------------------------+------+--------------+--------------+
```

---

## Summary of Changes

| Line(s) | Current | Fixed |
|---------|---------|-------|
| 716 | `width: 45%` | `width: 25%` |
| 717 | No width on value cell | `width: 30%` |
| 723 | `font-weight: 700` | `font-weight: 700; width: 25%` |
| 724 | No width | Add `width: 30%` |
| All product rows | 45%/auto split | 25%/30% split |
| CSS | None | Add column separation styles |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/yutong-order-invoice-generator.ts` | Update table column widths, add CSS for separation |

