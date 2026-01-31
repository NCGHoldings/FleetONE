

# Light Vehicle - Add Responsible Persons Footer Selection (Like Yutong)

## Overview

The Yutong module allows users to select which sales person's contact details (name, phone, email) appear in the footer of quotations and documents. The Light Vehicle module needs this same capability.

## Current State Analysis

### Yutong Implementation (Target)
- `yutong_responsible_persons` table has: `name`, `phone`, `email`, `position`, `is_default`
- `yutong_quotations` has a `responsible_person_id` foreign key
- Quotation form has dropdown to select responsible person
- Document footer displays: phone, email, name from selected person

### Light Vehicle Current State
- `lightvehicle_responsible_persons` table has: `role`, `person_name`, `designation`, `signature_data` (for document signatures)
- Missing: `phone`, `email` columns
- `lightvehicle_quotations` does NOT have `responsible_person_id` column
- Footer is hardcoded: `+94 77 123 4567`, `info@ncgholdings.lk`

---

## Implementation Plan

### 1. Database Changes

**Add columns to `lightvehicle_responsible_persons`:**
```sql
ALTER TABLE lightvehicle_responsible_persons 
ADD COLUMN phone TEXT,
ADD COLUMN email TEXT,
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
```

**Add column to `lightvehicle_quotations`:**
```sql
ALTER TABLE lightvehicle_quotations 
ADD COLUMN responsible_person_id UUID REFERENCES lightvehicle_responsible_persons(id);
```

### 2. Update Responsible Persons Admin UI

**File:** `src/components/lightvehicle/LightVehicleResponsiblePersonsAdmin.tsx`

Add form fields for phone, email, and is_default toggle:
- Add Phone input field
- Add Email input field  
- Add "Set as Default" button/toggle
- Update form schema and submit handlers
- Display phone/email in the cards list

### 3. Update Quotation Form

**File:** `src/components/lightvehicle/LightVehicleQuotationForm.tsx`

- Add `responsible_person_id` to form schema
- Load responsible persons on mount (active only)
- Add dropdown to select responsible person
- Auto-select default person if available
- Include `responsible_person_id` in quotation insert

### 4. Update Edit Quotation Modal

**File:** `src/components/lightvehicle/LightVehicleEditQuotationModal.tsx`

- Add `responsible_person_id` field to form
- Load and populate existing value
- Include in update/versioning logic

### 5. Update Quotation Preview Footer

**File:** `src/components/lightvehicle/LightVehicleQuotationPreview.tsx`

- Fetch responsible person by `quotation.responsible_person_id`
- Replace hardcoded footer contact with dynamic values:
  ```tsx
  📞 {responsiblePerson?.phone || "+94 77 123 4567"}
  ✉️ {responsiblePerson?.email || "info@ncgholdings.lk"}
  👤 {responsiblePerson?.person_name} (if selected)
  ```

### 6. Update Invoice/Document Generators

**Files:**
- `src/lib/lightvehicle-order-invoice-generator.ts`
- `src/components/lightvehicle/LightVehicleCashReceiptPreview.tsx`

Pass responsible person data to document generators and display in footers.

---

## UI/UX Flow

```text
Settings > Responsible Persons
┌────────────────────────────────────────────────────────────┐
│ Settings - Responsible Persons              [+ Add Person] │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Manager          [approved_by]           [★ Default]   │ │
│ │ General Manager                                        │ │
│ │ 📞 +94 77 766 5501  ✉️ manager@ncgholdings.lk         │ │
│ │                                          [Edit] [Del]  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Sales Executive  [prepared_by]                         │ │
│ │ Sales Executive                                        │ │
│ │ 📞 +94 77 123 4567  ✉️ sales@ncgholdings.lk           │ │
│ │                                          [Edit] [Del]  │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

Quotation Form
┌────────────────────────────────────────────────────────────┐
│ ... other fields ...                                       │
│                                                            │
│ Responsible Person                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Manager - General Manager (Default)              ▼   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ ... other fields ...                                       │
└────────────────────────────────────────────────────────────┘

Quotation Document Footer
┌────────────────────────────────────────────────────────────┐
│ 📞 +94 77 766 5501                                         │
│ 📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita          │
│ ✉️ manager@ncgholdings.lk                                  │
│ 👤 Manager                                                 │
└────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `LightVehicleResponsiblePersonsAdmin.tsx` | Add phone, email, is_default fields |
| `LightVehicleQuotationForm.tsx` | Add responsible person dropdown |
| `LightVehicleEditQuotationModal.tsx` | Add responsible person field |
| `LightVehicleQuotationPreview.tsx` | Dynamic footer from responsible person |
| `LightVehicleCashReceiptPreview.tsx` | Dynamic footer (if applicable) |
| `lightvehicle-order-invoice-generator.ts` | Accept and display responsible person |

---

## Technical Notes

1. **Backward Compatibility**: Existing quotations without `responsible_person_id` will show default hardcoded contact info
2. **Default Selection**: When creating quotations, auto-select the person marked as `is_default`
3. **Feature Parity**: Implementation mirrors Yutong's `YutongQuotationForm.tsx` lines 593-619 and `YutongQuotationPreview.tsx` footer pattern

