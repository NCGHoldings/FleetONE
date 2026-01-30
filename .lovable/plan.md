
# Fix Yutong Quotation Form - Warranty Terms, Payment Terms & Special Features

## Problem Summary

When editing and updating Yutong quotations, the following fields are not displaying correctly in the form or not being saved properly:
- **Warranty Terms** - Shows in database but not populating in edit form
- **Payment Terms** - Not displaying or saving correctly  
- **Special Features** - Not displaying or saving correctly
- **Delivery Timeline** - May have similar issues

## Root Causes Identified

### Issue 1: Textarea Value Handling
In `YutongEditQuotationModal.tsx`, the Textarea components spread `{...field}` directly, but when `field.value` is `undefined`, this can cause React controlled component warnings and prevent proper display.

**Current Code (Lines 1024, 1038, 1052):**
```typescript
<Textarea {...field} />
```

**Problem:** When the form initially loads or if the database returns `null`, the value may be undefined, causing the controlled input to behave unexpectedly.

### Issue 2: Form Field Type Inconsistency
- **Create Form** uses `<Input>` for warranty_terms and payment_terms (single line)
- **Edit Form** uses `<Textarea>` (multi-line)

This is actually intentional (Textarea allows more detailed terms), but needs proper value handling.

### Issue 3: Null/Empty String Handling
The form reset at line 181-184 handles null → empty string conversion:
```typescript
special_features: quotation.special_features || '',
delivery_timeline: quotation.delivery_timeline || '',
payment_terms: quotation.payment_terms || '',
warranty_terms: quotation.warranty_terms || '',
```

But the Textarea needs explicit value handling to ensure empty string is passed.

---

## Solution

### Fix 1: Update Textarea Fields in Edit Modal

**File: `src/components/yutong/YutongEditQuotationModal.tsx`**

Change all Textarea form fields to explicitly handle values:

```typescript
// Line 1024: special_features
<Textarea 
  placeholder="Enter any special features or customizations"
  value={field.value || ''} 
  onChange={field.onChange}
  onBlur={field.onBlur}
  name={field.name}
/>

// Line 1038: payment_terms
<Textarea 
  placeholder="Enter payment terms (e.g., 30% advance, balance on delivery)"
  value={field.value || ''} 
  onChange={field.onChange}
  onBlur={field.onBlur}
  name={field.name}
/>

// Line 1052: warranty_terms  
<Textarea 
  placeholder="Enter warranty terms"
  value={field.value || ''} 
  onChange={field.onChange}
  onBlur={field.onBlur}
  name={field.name}
/>
```

### Fix 2: Update Delivery Timeline Input

**Line 1009:**
```typescript
<Input 
  placeholder="e.g., 3-4 months" 
  value={field.value || ''} 
  onChange={field.onChange}
  onBlur={field.onBlur}
  name={field.name}
/>
```

### Fix 3: Ensure Create Form Uses Proper Handling

**File: `src/components/yutong/YutongQuotationForm.tsx`**

Update the warranty_terms and payment_terms fields to also use Textarea for consistency and proper multi-line support, matching the edit form:

**Lines 549-575:**
```typescript
<FormField
  control={form.control}
  name="payment_terms"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Payment Terms</FormLabel>
      <FormControl>
        <Textarea 
          placeholder="e.g., 30% advance, balance on delivery" 
          value={field.value || ''} 
          onChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="warranty_terms"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Warranty Terms</FormLabel>
      <FormControl>
        <Textarea 
          placeholder="e.g., Engine - 3 years, Wearable Parts - 1 month" 
          value={field.value || ''} 
          onChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Also update special_features (Line 524):
```typescript
<Textarea 
  placeholder="Any special features or customizations" 
  value={field.value || ''} 
  onChange={field.onChange}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/yutong/YutongEditQuotationModal.tsx` | Fix Textarea value handling for warranty_terms, payment_terms, special_features, delivery_timeline |
| `src/components/yutong/YutongQuotationForm.tsx` | Update Input→Textarea for warranty_terms & payment_terms, fix value handling |

---

## Technical Details

### Why This Fixes the Issue

1. **Explicit Value Binding**: Using `value={field.value || ''}` ensures the input always has a defined string value, preventing React controlled/uncontrolled component issues.

2. **Consistent Field Behavior**: Explicitly passing `onChange`, `onBlur`, and `name` ensures all form field callbacks are properly wired.

3. **Form Consistency**: Using Textarea for multi-line terms in both create and edit forms provides consistent UX.

### Database Verification

Confirmed the columns exist and contain data:
- `warranty_terms` (text) ✓
- `payment_terms` (text) ✓  
- `special_features` (text) ✓
- `delivery_timeline` (text) ✓

Example data: Quotation YTQ-20260113-0001-v1.10 has:
- warranty_terms: "Engine and Gearbox - 3 years or 300,000km..."
- special_features: "Super Luxury Seats - 28+1+1"

---

## Expected Outcome

After these fixes:
1. ✅ Warranty Terms will properly display in edit form with existing data
2. ✅ Payment Terms will properly display and save
3. ✅ Special Features will properly display and save
4. ✅ All fields will be persisted when clicking "Update Quotation"
5. ✅ New quotation versions will correctly inherit these fields
6. ✅ Quotation preview will show the Additional Terms section correctly
