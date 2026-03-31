

# Swap Live & Test Labels — Analysis & Recommendation

## Your Understanding is Correct ✓

Yes — when you select **Test Yutong** and create an advance payment, it saves with the test company_id. When you select **Yutong Sales** (live), payments save with the live company_id. They are completely isolated. The company switcher IS your toggle between test and live.

## The Problem with Swapping Names

You want to rename the empty one to "Live" and keep the data-filled one as "Test". However, the live company ID (`f40b0a9d...`) is **hardcoded in 22 files** across the entire codebase for GL consolidation, finance settings, and accounting logic. Swapping IDs would be extremely risky and could break the entire finance system.

## Recommended Approach Instead

Keep the structure as-is, but **clear the live data** so it becomes your fresh "Real/Live" database:

```text
CURRENT STATE                      AFTER FIX
─────────────                      ─────────
NCG Holding (has data)     →       NCG Holding - LIVE (clean, COA only)
NCG Test Environment (empty) →     NCG Test Environment (keep for testing)
```

### Steps

1. **Clear all transaction data from NCG Holding** (the live one)
   - Delete: journal entries, AR/AP invoices, receipts, payments, customers, vendors, bank transactions, Yutong/Sinotruck/LV orders & payments
   - Keep: Chart of Accounts (structure + codes), GL settings, company structure
   - Reset COA balances to zero

2. **Add a "LIVE" visual indicator** to the company switcher
   - Live companies show a green "LIVE" badge
   - Test companies keep the orange "TEST" badge
   - This makes it crystal clear which environment you're in

3. **Add a "LIVE MODE" banner** (green) when working in the live environment
   - Similar to the TEST MODE orange banner but green
   - Shows: "🟢 LIVE MODE — This is your production environment"

### Result

- **NCG Holding** = your clean LIVE database (empty transactions, full COA)
- **NCG Test Environment** = your test sandbox (create test data freely, clear anytime)
- Visual badges make it impossible to confuse them

### Files to modify
- `src/components/accounting/CompanySwitcher.tsx` — add LIVE badge
- `src/components/accounting/TestModeBanner.tsx` — add live mode banner variant
- Data clearing via SQL (one-time operation to wipe live transactions)

