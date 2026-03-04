

# Fix: Initialize Only Tax Invoice Template (Without 49 Errors)

## Problem
The "Initialize All Templates" and "Replace All Templates" buttons loop through **every** `document_template_types` row × **every** company. If any template type in the DB lacks a generator in the seeder (e.g., vehicle-sales-specific types like `yutong_order_invoice`, `sinotruck_order_invoice`, etc.), it produces an error for each company. That is the source of the 49 errors — they are not related to the tax invoice itself.

The tax invoice template and its generator are correctly registered. The errors come from **other** template types that exist in the database but have no matching seeder function.

## Fix

### Add a "Initialize Single Template Type" capability
**File: `src/components/accounting/settings/TemplateInitializerButton.tsx`**
- Add a new optional prop `singleTypeCode?: string` to allow initializing just one template type
- OR (simpler): filter the `templateTypes` loop to skip types that have no generator in `defaultTemplates`, so those 49 errors stop appearing

### Recommended approach: Skip types without generators
In the `initializeTemplates` function, change the inner loop to **skip** template types that don't have a matching entry in `defaultTemplates` instead of reporting them as errors. This fixes the 49 errors without needing a new button.

**Change in `TemplateInitializerButton.tsx` (line 74-85)**:
- Currently: if no generator found → push error result
- Fix: if no generator found → simply skip (don't count it in total operations either)

This means:
- "Initialize All" will only process the 13 types that have generators (including tax_invoice)
- No more false "error" results for vehicle-sales-specific template types
- Tax invoice will initialize correctly for all companies

### Files to modify
1. `src/components/accounting/settings/TemplateInitializerButton.tsx` — filter out template types without generators before the loop, and recalculate `totalOperations` accordingly

