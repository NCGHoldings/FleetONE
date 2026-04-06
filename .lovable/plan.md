

# Add Optional Cost Allocation by Business Unit to AP Invoice

## Problem
When NCG Holding pays a shared expense (e.g., LKR 1,000 insurance), it needs to be allocated across sub-companies — e.g., Special Hire 300, School Bus 400, Yutong 300. Currently the AP invoice only tags a single `business_unit_code`. There's no way to split costs across multiple business units.

## Solution
Add an optional **"Allocate to Business Units"** toggle section in the AP Invoice form. When enabled, users can add allocation rows selecting a business unit and entering either an amount or percentage. The GL posting will then create separate JE lines per business unit instead of one lump entry.

## Changes

### 1. Modify: `src/components/accounting/APInvoiceForm.tsx`

**New state**:
- `allocateToUnits: boolean` (toggle)
- `allocations: Array<{ id: string; unit_code: string; amount: number; percentage: number; mode: 'amount' | 'percentage' }>` 

**New UI section** (between WHT/Totals and Notes):
- Toggle: "Allocate to Business Units (Optional)"
- When on, show:
  - Mode selector: "By Amount" / "By Percentage"
  - Allocation rows with: Business Unit dropdown (SBO, YUT, SPH, LTV, SNT), Amount or %, calculated amount
  - "Add Unit" button
  - Running total showing allocated vs unallocated amount
  - Validation: total allocations must equal invoice subtotal (show warning if mismatch)

**Business unit options**: SBO (School Bus), YUT (Yutong), SPH (Special Hire), LTV (Light Vehicle), SNT (Sinotruck)

**On submit**: Pass `cost_allocations` array to the mutation

### 2. Modify: `src/hooks/useAccountingMutations.ts` — `useCreateAPInvoice`

**Accept new parameter**: `cost_allocations?: Array<{ unit_code: string; amount: number }>`

**Modified GL posting logic**:
- If `cost_allocations` is provided and non-empty:
  - Instead of creating one DR Expense line, create multiple DR Expense lines — one per allocation, each tagged with the respective `business_unit_code`
  - The CR Trade Payable line remains a single entry (total amount)
  - Each JE line gets the correct `business_unit_code` for sub-company isolation
- If no allocations (default), existing single-unit posting logic is unchanged

**Store allocations**: Save the allocations as a JSON field in `ap_invoices.notes` (appended) or as a metadata column. Since there's no dedicated column, we'll store in a structured format within the notes field like `[COST_ALLOC: SBO=400, YUT=300, SPH=300]` — or better, create a simple helper that embeds it.

Actually, since `journal_entry_lines` already has `business_unit_code`, the allocation data is naturally captured in the GL entries themselves. We just need to pass the allocations to the GL posting function.

### 3. Modify: `src/lib/gl-posting-utils.ts` — `postAPInvoiceToGL`

**Accept new parameter**: `costAllocations?: Array<{ unitCode: string; amount: number }>`

**Modified line generation**:
- When `costAllocations` is present:
  - Create one DR Expense line per allocation, each with its own `business_unit_code` and proportional amount
  - If there are per-line expense accounts, split proportionally across allocations
  - Single CR Trade Payable line (full amount, tagged to the invoice's primary business unit or HQ)
- Tax splitting: proportionally allocate tax across units based on their expense share

## Result
- NCG Holding AP invoices can optionally split costs across SBO, YUT, SPH, LTV, SNT
- Each business unit's P&L correctly reflects their share of the expense
- GL entries maintain proper DR=CR balance
- Existing single-unit invoices are completely unaffected
- Allocations are visible in Journal Entry drill-down (each line shows its business unit badge)

## Files
- **Modify**: `src/components/accounting/APInvoiceForm.tsx` — add allocation toggle + UI
- **Modify**: `src/hooks/useAccountingMutations.ts` — pass allocations to GL posting
- **Modify**: `src/lib/gl-posting-utils.ts` — split expense lines by business unit

