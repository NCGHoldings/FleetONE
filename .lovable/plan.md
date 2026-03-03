

# Add Customer Category-Based GL Account Mapping

## The Problem

Currently, ALL customers use the **same** Trade Receivable account from Core GL Settings. But your CoA has multiple receivable accounts (e.g., "Trade Receivable - External" and "Trade Receivable - Internal"), and different customers should post to different accounts.

## The Solution: Customer Categories with GL Account Mappings

Instead of linking individual customers to accounts one-by-one, we create **Customer Categories** (e.g., "External Customer", "Internal/Intercompany", "Government", "School") and map each category to its own set of GL accounts. Then when creating a customer, you pick their category, and the system automatically uses the correct GL accounts.

```text
Customer Category Table
========================
| Category Name     | AR Account              | Revenue Account         | Advance Account         |
|-------------------|-------------------------|-------------------------|-------------------------|
| External          | 12201001 Trade Rec-Ext  | 41010001 Sales Rev-Ext  | (default)               |
| Internal          | 12201002 Trade Rec-Int  | 41010002 Sales Rev-Int  | (default)               |
| Government        | 12201003 Trade Rec-Gov  | 41010001 Sales Rev-Ext  | (default)               |
| School            | 12201004 Trade Rec-Sch  | 41020001 School Rev     | (default)               |

Flow:
Customer -> belongs to Category -> Category has GL Accounts
AR Invoice created -> Check Customer's Category -> Use Category's AR Account (or fallback to GL Settings default)
```

## What Changes

### 1. New Database Table: `customer_categories`
- `id`, `company_id`, `category_name`, `category_code`, `description`
- `ar_account_id` (FK to chart_of_accounts) -- Trade Receivable for this category
- `revenue_account_id` (FK to chart_of_accounts) -- Revenue account override
- `advance_account_id` (FK to chart_of_accounts) -- Advance receipt override
- `is_active`, `created_at`, `updated_at`

### 2. Add `customer_category_id` to `customers` table
- New FK column linking each customer to their category
- The existing `ar_account_id` column will be kept as an **individual override** (customer-specific override takes priority over category)

### 3. New UI: Customer Categories Management
- New section in Accounting Settings (alongside Core GL Settings)
- Table listing categories with their mapped GL accounts
- Add/Edit/Delete category forms with `SearchableFinanceAccountSelector` for each GL account

### 4. Update Customer Form
- Add a "Customer Category" dropdown when creating/editing customers
- Optional -- if not selected, the global GL Settings default is used

### 5. Update GL Posting Logic
- When posting AR Invoice / AR Receipt / Advance Receipt:
  - **Priority 1**: Customer's own `ar_account_id` (individual override)
  - **Priority 2**: Customer's Category `ar_account_id`
  - **Priority 3**: Global `gl_settings.trade_receivable_account_id` (current behavior, fallback)

This ensures backwards compatibility -- existing customers without a category continue using the global default.

## Technical Details

### Database Migration
```sql
-- Customer Categories table
CREATE TABLE public.customer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  ar_account_id UUID REFERENCES chart_of_accounts(id),
  revenue_account_id UUID REFERENCES chart_of_accounts(id),
  advance_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, category_code)
);

-- Add category FK to customers
ALTER TABLE customers ADD COLUMN customer_category_id UUID REFERENCES customer_categories(id);

-- RLS + indexes
```

### Files to Create
- `src/components/accounting/CustomerCategoryManagement.tsx` -- CRUD UI for categories
- `src/hooks/useCustomerCategories.ts` -- React Query hooks for categories

### Files to Modify
- `src/components/accounting/CustomerForm.tsx` -- Add category dropdown
- `src/hooks/useAccountingMutations.ts` -- Update AR Invoice/Receipt GL posting to resolve account via category hierarchy
- `src/lib/gl-posting-utils.ts` -- Add helper `resolveReceivableAccount(customerId, companyId)` that checks customer -> category -> global fallback
- `src/components/settings/CoreGLSettings.tsx` -- Add note that these are "default" accounts (overridden by category)
- Accounting Settings page -- Add Customer Categories tab/section

### Account Resolution Flow (in gl-posting-utils.ts)
```typescript
async function resolveARAccounts(customerId: string, companyId: string) {
  // 1. Check customer's direct ar_account_id
  const customer = await fetch customer with category join
  if (customer.ar_account_id) return customer accounts
  // 2. Check customer's category accounts
  if (customer.customer_category?.ar_account_id) return category accounts
  // 3. Fall back to global gl_settings
  return gl_settings accounts
}
```

## Summary
- 1 new database table (`customer_categories`)
- 1 new column on `customers` table
- 2 new files (category UI + hooks)
- 4-5 files modified (customer form, GL posting logic, settings page)
- Full backwards compatibility -- existing data continues working with global defaults

