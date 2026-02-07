
# Special Hire Module - Comprehensive Testing & Issue Fixes Plan

## Executive Summary

After thorough code analysis of the Special Hire module, I've identified several areas that need attention and testing. This plan covers the complete flow from quotation creation to finance integration.

---

## Part 1: Current Code Analysis - Key Findings

### A. Manual KM Entry System
**Current Implementation:**
- `useManualTripDistance` state controls manual trip distance override
- `useManualParkingDistance` state controls parking distance override
- Located in SpecialHireForm.tsx lines 157-159

**Potential Issues Found:**
1. Manual KM toggle UI may not be prominent enough for users to find
2. When manual KM is entered, the cost breakdown should recalculate all dependent values

### B. Available Hours Calculation Logic
**Current Implementation (extra-time-calculator.ts):**
- **Outside Hire:** `availableHours = tripDistance / 10` (distance-based, 10 km/h baseline)
- **Lyceum/Internal Hire:** `availableHours = standardHours` (rate card based, typically 4h or 8h)

**Display in CostBreakdown.tsx (lines 584-673):**
- Shows: Standard Hours, Available Hours, Actual Hours
- Missing: **Overtime Hours** is not displayed as a separate row in the Working Hours Analysis section

### C. Cost Breakdown Display
**Current sections displayed:**
1. Distance Analysis (Parking→Pickup, Trip, Drop→Parking, Total)
2. Bus Fleet Breakdown (if multi-bus)
3. Post-Trip Adjustments (if finalized)
4. Hire Charges Breakdown (Base Rate, Overtime, Overnight, Exceeding Distance)
5. Working Hours Analysis (Standard, Available, Actual)
6. Deductions (Fuel, Maintenance, Additional Charges, Commission)
7. Net Profit

---

## Part 2: Issues to Fix

### Issue 1: Working Hours Analysis - Missing Overtime Hours Row

**Problem:** The "Overtime Hours" value is calculated but not displayed as a separate row in the Working Hours Analysis section.

**Location:** `src/components/special-hire/CostBreakdown.tsx` lines 584-673

**Fix Required:** Add a fourth column for "Overtime Hours" in the Working Hours Analysis grid.

```typescript
// Current: grid-cols-3
// Change to: grid-cols-4 with Overtime Hours column
```

### Issue 2: Available Hours Display Inconsistency

**Problem:** For Lyceum/Internal hires, the available hours should show rate card `standard_hours`, but the code may fall back to distance calculation incorrectly.

**Location:** `src/components/special-hire/CostBreakdown.tsx` lines 601-614

**Fix Required:** Ensure Lyceum/Internal hires use `rateCardDetails.standardHours` instead of distance-based calculation.

### Issue 3: Manual KM Entry Not Triggering Full Recalculation

**Problem:** When manual KM is entered, the cost breakdown shows updated distances but some dependent calculations (overtime baseline) may not recalculate.

**Location:** `src/components/special-hire/SpecialHireForm.tsx` around line 1200-1250

**Fix Required:** Ensure `calculateExtraTimeCharge` receives the manual trip distance for overtime baseline calculation.

### Issue 4: Calculator Page Missing Hire Type Context

**Problem:** The EnhancedCostCalculator uses Outside hire logic for all quotations when recalculating available hours.

**Location:** `src/components/special-hire/EnhancedCostCalculator.tsx` lines 409-446

**Fix Required:** Pass hire_type to available hours calculation:
- If Outside: use `tripDistance / 10`
- If Lyceum/Internal: use `rateCard.standard_hours`

---

## Part 3: Testing Checklist

### Test 1: Create Quotation with Manual KM Entry

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Special Hire → New Quotation | Form opens |
| 2 | Fill customer details | Fields populate |
| 3 | Select hire type "Outside" | Rate card loads |
| 4 | Select bus type | Bus selected |
| 5 | Enter pickup/drop locations | Google Maps suggestions appear |
| 6 | Toggle "Manual Trip Distance Override" | Manual KM input appears |
| 7 | Enter 150 km manually | Distance field shows 150 km |
| 8 | Click "Calculate" | Cost breakdown displays with manual distance |
| 9 | Verify Distance Analysis | Shows "Trip Distance: 150 km (Manual)" badge |
| 10 | Verify Available Hours | Shows 150/10 = 15 hours for Outside hire |

### Test 2: Verify Time Calculations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set pickup time: 8:00 AM | Time set |
| 2 | Set drop time: 6:00 PM (10 hours) | Time set |
| 3 | With 100km trip | Available: 10h, Actual: 10h, Overtime: 0h |
| 4 | With 50km trip | Available: 5h, Actual: 10h, Overtime: 5h |
| 5 | Verify overtime charge | Overtime hours × hourly rate shown |

### Test 3: Lyceum Hire Time Calculation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select hire type "Lyceum" | Rate card changes |
| 2 | Select 4-hour rate card | Standard hours = 4 |
| 3 | Set trip duration = 6 hours | Actual = 6h |
| 4 | Verify Available Hours | Shows 4h (from rate card, NOT distance/10) |
| 5 | Verify Overtime | 6h - 4h = 2h overtime |

### Test 4: Cost Breakdown Completeness

| Section | Required Rows | Verify |
|---------|---------------|--------|
| Distance Analysis | Parking→Pickup, Trip, Drop→Parking, Additional KM, Total | ✓ All displayed |
| Working Hours | Standard, Available, Actual, **Overtime** | ✓ All 4 displayed |
| Hire Charges | Base Rate, Overtime Charge, Overnight Charge, Exceeding KM | ✓ All displayed |
| Customer Total | Original Quote Amount | ✓ Highlighted green |
| Deductions | Fuel, Maintenance, Charges, Commission | ✓ All listed |
| Net Profit | Final profit amount | ✓ Displayed |

### Test 5: Calculator Page Verification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Calculator tab | Page loads |
| 2 | Search for quotation | Quotation appears in list |
| 3 | Select quotation | Cost breakdown loads |
| 4 | Verify all sections match quotation form | Identical calculations |
| 5 | Check Working Hours for Lyceum | Uses standard_hours not distance/10 |

### Test 6: Post-Trip Adjustment Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to Confirmed Trips | List shows trips |
| 2 | Click "Post-Trip Adjustment" | Modal opens |
| 3 | Enter actual KM traveled | Extra KM calculated |
| 4 | Enter actual pickup/drop times | Time adjustment calculated |
| 5 | Add additional expenses | Expenses listed |
| 6 | Save as Draft | Draft saved |
| 7 | Finalize adjustment | Status changes to "finalized" |
| 8 | View cost breakdown | Shows post-trip section with adjustments |

### Test 7: Advance Payment Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record advance payment | Payment form opens |
| 2 | Enter amount and method | Data saved |
| 3 | Upload payment proof | Image uploaded |
| 4 | Submit for finance approval | Status = "pending_finance" |
| 5 | Finance approves | Status = "approved" |
| 6 | Verify GL posting | Journal entry created (DR Bank / CR Customer Advance) |
| 7 | Verify AR Invoice | Invoice created with advance noted |

### Test 8: Balance Invoice Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete post-trip adjustment | Adjustment finalized |
| 2 | Click "Generate Balance Invoice" | Modal opens |
| 3 | Review final amounts | Shows original + adjustments - advance |
| 4 | Generate invoice | Invoice PDF created |
| 5 | Verify GL posting | DR Trade Receivable / CR Revenue posted |

### Test 9: Finance Integration Verification

| Component | Action | Expected GL Entry |
|-----------|--------|-------------------|
| Advance Payment | Approve | DR Bank / CR Customer Advance (Liability) |
| Balance Invoice | Generate | DR Trade Receivable / CR Sales Revenue |
| Balance Payment | Approve | DR Bank / CR Trade Receivable |
| Full Payment | Approve | DR Bank / CR Revenue (direct) |

---

## Part 4: Files to Modify

### File 1: CostBreakdown.tsx
**Changes:**
- Add "Overtime Hours" column to Working Hours Analysis
- Ensure Lyceum/Internal hires show rate card standard_hours correctly
- Display hire type context in working hours explanation

### File 2: EnhancedCostCalculator.tsx
**Changes:**
- Update available hours calculation to respect hire type
- Add hire type indicator to working hours section
- Fix historical quotation recalculation for Lyceum type

### File 3: SpecialHireForm.tsx
**Changes:**
- Ensure manual KM triggers complete recalculation including overtime baseline
- Pass hire type to calculateExtraTimeCharge for correct available hours

---

## Part 5: Implementation Sequence

| Step | Task | Priority |
|------|------|----------|
| 1 | Fix Working Hours Analysis to show 4 columns including Overtime | High |
| 2 | Fix Lyceum available hours to use standard_hours | High |
| 3 | Fix EnhancedCostCalculator hire type logic | Medium |
| 4 | Test manual KM entry full recalculation | High |
| 5 | Test all finance flows end-to-end | High |
| 6 | Verify all cost breakdown sections display correctly | Medium |

---

## Summary

The Special Hire module has comprehensive functionality but needs these key fixes:
1. **Working Hours Analysis**: Add Overtime Hours as 4th column
2. **Hire Type Context**: Ensure Lyceum/Internal uses rate card hours, not distance/10
3. **Calculator Page**: Fix recalculation logic to respect hire type
4. **Complete Testing**: All flows need end-to-end verification

Would you like me to implement these fixes after approval?
