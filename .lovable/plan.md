
# Fix Yutong Invoice Table Layout to Match Reference

## Problem Analysis

Comparing the current invoice preview with the reference image, there are several layout issues:

### Current State (Issues)
- Table has 11 rows with rowspan="11" for QTY/UNIT PRICE/TOTAL
- AMOUNT IN WORD section is separate from the product table
- Totals section (SUB TOTAL, PAYMENT, TOTAL) is also separate
- Extra rows like ENGINE CAPACITY and COLOUR that aren't in the reference

### Reference Image Shows
- 8 product rows: MAKE, BUS MODEL, SEATING CAPACITY, YEAR, CONDITION, FUEL TYPE, ENGINE NO, CHASIS NUMBER
- QTY, UNIT PRICE, TOTAL columns span all 8 rows vertically
- AMOUNT IN WORD section is part of the same table structure
- Totals (SUB TOTAL, PAYMENT, TOTAL) are in the table rows below

---

## Technical Changes

### File: `src/lib/yutong-order-invoice-generator.ts`

### 1. Update Table Structure

Change the product table to exactly 8 rows with proper rowspan:

```html
<table class="invoice-table">
  <thead>
    <tr>
      <th colspan="2" style="width:55%;">PRODUCT</th>
      <th style="width:10%;">QTY</th>
      <th style="width:17%;">UNIT PRICE</th>
      <th style="width:18%;">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    <tr class="invoice-body">
      <td>MAKE</td>
      <td>YUTONG</td>
      <td rowspan="8" class="qty merged-cell">1.00</td>
      <td rowspan="8" class="price merged-cell">37,500,000.00</td>
      <td rowspan="8" class="total merged-cell">37,500,000.00</td>
    </tr>
    <tr class="invoice-body"><td>BUS MODEL</td><td>ZK6907H</td></tr>
    <tr class="invoice-body"><td>SEATING CAPACITY</td><td>37+1+1</td></tr>
    <tr class="invoice-body"><td>YEAR</td><td>2025</td></tr>
    <tr class="invoice-body"><td>CONDITION</td><td>BRAND NEW</td></tr>
    <tr class="invoice-body"><td>FUEL TYPE</td><td>DIESEL</td></tr>
    <tr class="invoice-body"><td>ENGINE NO</td><td>A5CYAS30128</td></tr>
    <tr class="invoice-body"><td>CHASIS NUMBER</td><td>LZYTDTD66S1041865</td></tr>
  </tbody>
</table>
```

### 2. Integrate Totals into Table Footer

Add the AMOUNT IN WORD and totals as footer rows within the same table:

```html
<!-- Footer rows in same table -->
<tr class="totals-footer">
  <td colspan="2" rowspan="3" class="amount-words-cell">
    <div class="amount-label">AMOUNT IN WORD<br/>(BALANCE PAYABLE)</div>
    <div class="amount-value">RUPEES THIRTY SEVEN MILLION FIVE HUNDRED THOUSAND</div>
  </td>
  <td colspan="2" class="totals-label">SUB TOTAL</td>
  <td class="totals-value">37,500,000.00</td>
</tr>
<tr class="totals-footer">
  <td colspan="2" class="totals-label">PAYMENT</td>
  <td class="totals-value">37,500,000.00</td>
</tr>
<tr class="totals-footer total-row">
  <td colspan="2" class="totals-label">TOTAL</td>
  <td class="totals-value">-</td>
</tr>
```

### 3. Update CSS Styles

Add styles to support the new integrated table layout:

```css
.totals-footer td {
  border: 2px solid #0b2f66;
  background: #e8f6ff;
  padding: 10px 14px;
}

.amount-words-cell {
  vertical-align: middle;
  text-align: center;
}

.amount-words-cell .amount-label {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
}

.amount-words-cell .amount-value {
  font-weight: 700;
  font-size: 16px;
  text-transform: uppercase;
}

.totals-label {
  text-align: center;
  font-weight: 700;
  font-size: 16px;
}

.totals-value {
  text-align: right;
  font-weight: 700;
  font-size: 16px;
  padding-right: 20px !important;
}

.totals-footer.total-row td {
  background: #0b2f66;
  color: white;
}
```

### 4. Remove Separate Bottom Section

Remove the current `<div class="bottom-section">` that contains the separate AMOUNT IN WORD and totals boxes, as these will now be integrated into the table.

---

## Visual Comparison

### Before (Current)
```
+-------------+------------------+------+--------------+--------------+
| PRODUCT     |                  | QTY  | UNIT PRICE   | TOTAL        |
+-------------+------------------+------+--------------+--------------+
| MAKE        | YUTONG           |      |              |              |
| BUS MODEL   | Yutong C9 (35)   |      |              |              |
| ...         | ...              | 1.00 | 37,500,000   | 37,500,000   |
| ENGINE NO   | 567543565        |      |              |              |
| CHASIS NO   | vfggbf           |      |              |              |
+-------------+------------------+------+--------------+--------------+

[Separate boxes below for AMOUNT IN WORD and SUBTOTAL]
```

### After (Matching Reference)
```
+-------------+------------------+------+--------------+--------------+
| PRODUCT     |                  | QTY  | UNIT PRICE   | TOTAL        |
+-------------+------------------+------+--------------+--------------+
| MAKE        | YUTONG           |      |              |              |
| BUS MODEL   | ZK6907H          |      |              |              |
| SEATING...  | 37+1+1           | 1.00 | 37,500,000   | 37,500,000   |
| YEAR        | 2025             |      |              |              |
| CONDITION   | BRAND NEW        |      |              |              |
| FUEL TYPE   | DIESEL           |      |              |              |
| ENGINE NO   | A5CYAS30128      |      |              |              |
| CHASIS NO   | LZYTDTD66S1041865|      |              |              |
+-------------+------------------+------+--------------+--------------+
| AMOUNT IN WORD                 | SUB TOTAL        | 37,500,000.00 |
| (BALANCE PAYABLE)              +------------------+---------------|
| RUPEES THIRTY SEVEN MILLION... | PAYMENT          | 37,500,000.00 |
|                                +------------------+---------------|
|                                | TOTAL            |       -       |
+--------------------------------+------------------+---------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/yutong-order-invoice-generator.ts` | Update table structure, integrate totals, add CSS styles |

---

## Summary of Changes

1. **Reduce product rows to 8** - Remove ENGINE CAPACITY and COLOUR, keep only fields shown in reference
2. **Change rowspan from 11 to 8** - Match the 8 product rows
3. **Integrate AMOUNT IN WORD into table** - Add as footer row spanning first 2 columns
4. **Add totals rows inside table** - SUB TOTAL, PAYMENT, TOTAL as table footer rows
5. **Update CSS** - Add styles for integrated table footer
6. **Remove separate bottom-section** - No longer needed as totals are in table
