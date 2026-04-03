

# Fix Trial Balance: Company ID Mismatch

## Root Cause
The Trial Balance shows all zeros because financial periods are seeded under `a0000000-...-0001` but **all real journal entries** (370 posted) are under different company IDs:
- `f40b0a9d-...` (NCGH, 177 entries) — the actual NCG Holding with sub-companies YUT, SBO, SNT, SPH, LTV
- `7ece7595-...` (NCGE, 176 entries) — NCG Express

The company `a0000000-...-0001` has only **14 posted JEs total** and **zero for March 2026**.

The code labels `f40b0a9d-...` as `NCG_TEST_ID` but it's actually the real production company where all finance approvals post journal entries.

## Fix: Seed Financial Periods for the Real Companies

### Migration
Create financial periods for both real companies that have journal entries:

1. **`f40b0a9d-ae5b-41b3-9188-535ae94c9020`** (real NCG Holding / NCGH) — Oct 2025 to Apr 2026, 7 monthly periods
2. **`7ece7595-8b7b-46de-8bfc-c1e8e0da7513`** (NCG Express / NCGE) — Oct 2025 to Apr 2026, 7 monthly periods

This ensures that when a user selects either company, the Trial Balance finds matching periods AND matching journal entries.

### Optional: Investigate Company ID Constants
The constants in `CompanyContext.tsx` may be swapped:
- `NCG_HOLDING_ID = 'a0000000-...-0001'` — appears to be a seed/placeholder company, not the real one
- `NCG_TEST_ID = 'f40b0a9d-...'` — is actually the production NCGH

This is a **separate, larger investigation** that affects many modules. For now, seeding periods for the real companies fixes the Trial Balance immediately.

### Files
- **Create**: Migration to insert 14 financial periods (7 for each real company)

### Result
- Trial Balance will show actual data when the user selects the real NCG Holding or NCG Express company
- All 370 posted journal entries become visible in the Trial Balance
- Opening/Period/Closing balances will populate correctly

