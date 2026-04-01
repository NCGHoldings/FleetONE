

# Fix Item Category Revenue Account Mappings

## Problem Found

All item categories (C1_SCHOOL_BUS, C1_YUTONG, C1_SINOTRUK, etc.) point to a generic header account `4100 - Sales Revenue` instead of the correct specific revenue accounts in the COA. This means AR invoices using item categories post revenue to the wrong GL account.

**However**: School Bus bulk billing is already correct — it uses `sbs_collection_account_id` from `school_bus_finance_settings`, which is mapped to `41103001 - TRANSPORT INCOME - SCHOOL BUSES`. The issue is only with the item category mappings used by manual AR invoices and the new category-based AR invoice form.

## What Needs to Change

Update the `sales_account_id` on all item categories to point to the correct specific COA revenue accounts:

```text
CATEGORY              CURRENT ACCOUNT         CORRECT ACCOUNT
─────────────────     ─────────────────────    ──────────────────────────────────
C*_YUTONG             4100 Sales Revenue  →   41101001 SALES - YUTONG
C*_SINOTRUK           4100 Sales Revenue  →   41101002 SALES - SINOTRUCK
C*_LVS                4100 Sales Revenue  →   41101003 SALES - LIGHT VEHICLES
C*_SCHOOL_BUS         4100 Sales Revenue  →   41103001 TRANSPORT INCOME - SCHOOL BUSES
C*_SPECIAL_HIRE       4100 Sales Revenue  →   41103003 TRANSPORT INCOME - SPECIAL HIRES EXTERNAL
C*_STAFF_TRANSPORT    4100 Sales Revenue  →   41103002 TRANSPORT INCOME - SPECIAL HIRES INTERNAL
C*_PARTS              4100 Sales Revenue  →   41104004 SALES OBSOLIT ITEMS (or create a Spare Parts account)
C*_SERVICE            4100 Sales Revenue  →   (keep as general or create Maintenance Revenue)
```

This affects C1_, C2_, C3_, C4_ prefixed categories (4 company sets × 8 categories = 32 updates).

## Implementation

### 1. Data update via SQL (using insert tool)
Update all 32 item category rows to map `sales_account_id` to the correct COA account IDs per company. Each company (C1=`a0000000...0001`, C2, C3, C4) has its own COA copy, so we map to the correct company's account.

### 2. No code changes needed
- The AR invoice form already reads `sales_account_id` from item categories (just implemented)
- School bus bulk billing already uses its own `sbs_collection_account_id` setting (correctly mapped)
- Vehicle sales modules already resolve via the 4-tier hierarchy

## Result
- Every AR invoice line using an item category will now post to the correct specific revenue GL account
- School bus income → `41103001 TRANSPORT INCOME - SCHOOL BUSES`
- Yutong sales → `41101001 SALES - YUTONG`
- No more generic `4100` catch-all revenue posting

