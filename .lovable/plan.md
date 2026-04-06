

# Fix: AP Payment GL Posting to Use Vendor Category Account Mappings

## Problem
When creating an AP Payment (normal or advance), the GL posting logic does **NOT** use the vendor's category-linked GL accounts. Instead, it searches the Chart of Accounts for any account with "trade payable" in the name (line 1148-1157 in `useAccountingMutations.ts`).

This means:
- **Vendor Category mappings are ignored** — even if a vendor is in category "SUP-INT" with Trade Payable mapped to "22101001 - TRADE PAYABLE - INTERNAL", the payment posts to whichever "trade payable" account the raw search finds first
- **Advance payments** don't use the category's `advance_account_id` at all — they post DR to the same generic trade payable instead of the vendor's advance account
- The `resolveVendorAPAccounts()` function already exists and is used by AP Invoice creation — but the Payment creation skips it entirely

## What works correctly today
- **AP Invoice creation** (line 840) — correctly calls `resolveVendorAPAccounts()` ✓
- **AP Invoice approval** (line 1808) — correctly calls `resolveVendorAPAccounts()` ✓
- **Leasing payments** — correctly calls `resolveVendorAPAccounts()` ✓
- **AP Payments** — does NOT use it ✗

## Solution

### Modify: `src/hooks/useAccountingMutations.ts`

Replace the raw COA search (lines 1145-1157) with `resolveVendorAPAccounts()`:

**Current code (broken):**
```typescript
const { data: payableAccounts } = await supabase
  .from("chart_of_accounts")
  .select("id, account_name")
  .eq("company_id", effectiveCompanyId)
  .eq("account_type", "liability")
  .eq("is_active", true)
  .ilike("account_name", "%trade payable%")
  .limit(1);

const tradePayableId = payableAccounts?.[0]?.id || null;
```

**New code (fixed):**
```typescript
const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
const resolvedAccounts = await resolveVendorAPAccounts(payment.vendor_id, effectiveCompanyId);

// For advance payments: use the advance account if available, else fall back to trade payable
const tradePayableId = payment.is_advance
  ? (resolvedAccounts.advanceAccountId || resolvedAccounts.apAccountId)
  : resolvedAccounts.apAccountId;
```

This ensures:
1. **Normal payments** → DR Trade Payable (from vendor category or global fallback), CR Bank
2. **Advance payments** → DR Supplier Advance account (from vendor category), CR Bank
3. If no category mapping exists, falls back to global GL settings (same as invoices)
4. WHT payable lookup remains unchanged (already correct)

## Files
- **Modify**: `src/hooks/useAccountingMutations.ts` — replace raw COA search with `resolveVendorAPAccounts()` in `useCreateAPPayment`

## Result
- AP Payments correctly hit the vendor's category-linked Trade Payable account (e.g., "TRADE PAYABLE - INTERNAL" for SUP-INT vendors)
- Advance payments correctly debit the vendor's Advance Payment account (e.g., "SUPPLIER ADVANCES - INTERNAL")
- Consistent with how AP Invoice creation already works
- Global fallback still applies if no category is configured

