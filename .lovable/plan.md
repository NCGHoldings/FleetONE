
# Referral Agent System - Complete Fix Plan

## Problem Summary

Based on my investigation, I found **4 critical issues** preventing referral tracking across all modules:

### Issue 1: Sinotruck Missing Referral Agent Support Entirely
**Problem**: The `sinotruck_quotations` table does NOT have a `referral_agent_id` column.
- **Evidence**: Database query confirmed column doesn't exist
- **Impact**: No Sinotruck referrals can ever be tracked

### Issue 2: Stats Only Query `referral_commission_payments` (Special Hire Only)
**Problem**: The ReferralAgentsManagement component (lines 95-99) only queries `referral_commission_payments` table for pending/paid calculations, ignoring Yutong and Light Vehicle commission tables.
- **Evidence**: Code shows only one table queried
- **Impact**: Stats show LKR 0 pending/paid even though there are 3 Yutong commission records worth LKR 4,399,500

### Issue 3: History Modal Only Shows Special Hire Records
**Problem**: ReferralAgentHistoryModal (lines 95-108) only fetches from `referral_commission_payments` with a join to `special_hire_quotations`.
- **Impact**: Agent history doesn't show Yutong, Light Vehicle, or Sinotruck referrals

### Issue 4: Light Vehicle Commission Trigger May Not Be Working
**Problem**: No records found in `lightvehicle_referral_commission_payments` even though the column and trigger exist.
- **Evidence**: Table is empty
- **Impact**: Light Vehicle referrals aren't being tracked

---

## Current State Summary

| Module | Has referral_agent_id? | Has Commission Table? | Trigger Working? | Records Found |
|--------|------------------------|----------------------|------------------|---------------|
| **Special Hire** | Yes | referral_commission_payments | Manual linking | 0 records |
| **Yutong** | Yes | yutong_referral_commission_payments | Yes | 3 records (LKR 4.4M) |
| **Light Vehicle** | Yes | lightvehicle_referral_commission_payments | Unknown | 0 records |
| **Sinotruck** | **NO** | **NONE** | N/A | N/A |

---

## Implementation Plan

### Part 1: Add Sinotruck Referral Agent Support

**Database Migration**:
```sql
-- Add referral_agent_id to sinotruck_quotations
ALTER TABLE sinotruck_quotations 
ADD COLUMN IF NOT EXISTS referral_agent_id UUID REFERENCES referral_agents(id);

-- Create sinotruck_referral_commission_payments table
CREATE TABLE IF NOT EXISTS sinotruck_referral_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES sinotruck_quotations(id),
  referral_agent_id UUID REFERENCES referral_agents(id),
  commission_amount NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 3,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quotation_id)
);

-- Create trigger for automatic tracking
CREATE OR REPLACE FUNCTION track_sinotruck_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.referral_agent_id IS NOT NULL THEN
    INSERT INTO sinotruck_referral_commission_payments (
      quotation_id, referral_agent_id, commission_amount, commission_pct, payment_status
    ) VALUES (
      NEW.id, NEW.referral_agent_id, COALESCE(NEW.total_price, 0) * 0.03, 3.0, 'pending'
    ) ON CONFLICT (quotation_id) DO NOTHING;
    
    UPDATE referral_agents 
    SET total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + (COALESCE(NEW.total_price, 0) * 0.03),
        updated_at = NOW()
    WHERE id = NEW.referral_agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_sinotruck_referral_commission_trigger
AFTER UPDATE ON sinotruck_quotations
FOR EACH ROW EXECUTE FUNCTION track_sinotruck_referral_commission();
```

**Update SinotruckQuotationForm.tsx**:
- Add `referral_agent_id` to form state
- Add referral agents dropdown selector UI
- Load referral agents on mount
- Include `referral_agent_id` in database insert

### Part 2: Fix Stats Aggregation in ReferralAgentsManagement

**Update `fetchAgents()` function** to query ALL commission tables:

```typescript
// Fetch from all 4 commission tables
const { data: specialHirePayments } = await supabase
  .from('referral_commission_payments')
  .select('referral_agent_id, commission_amount, payment_status');

const { data: yutongPayments } = await supabase
  .from('yutong_referral_commission_payments')
  .select('referral_agent_id, commission_amount, payment_status');

const { data: lightVehiclePayments } = await supabase
  .from('lightvehicle_referral_commission_payments')
  .select('agent_id, commission_amount, status');

const { data: sinotruckPayments } = await supabase
  .from('sinotruck_referral_commission_payments')
  .select('referral_agent_id, commission_amount, payment_status');

// Combine all payments
const allPayments = [
  ...(specialHirePayments || []).map(p => ({...p, source: 'special_hire'})),
  ...(yutongPayments || []).map(p => ({...p, source: 'yutong'})),
  ...(lightVehiclePayments || []).map(p => ({
    referral_agent_id: p.agent_id, 
    commission_amount: p.commission_amount, 
    payment_status: p.status,
    source: 'light_vehicle'
  })),
  ...(sinotruckPayments || []).map(p => ({...p, source: 'sinotruck'}))
];
```

### Part 3: Fix History Modal to Show All Modules

**Update ReferralAgentHistoryModal** to fetch and display records from all 4 commission tables, with a "Source" column showing which module each referral came from (Special Hire, Yutong, Light Vehicle, Sinotruck).

### Part 4: Add Referral Agent Selector to Sinotruck Form UI

Add referral agent selector similar to Yutong form:
- Load agents from `referral_agents` table
- Show Select dropdown with agent names
- Include "Add Agent" button for inline creation
- Store `referral_agent_id` when saving quotation

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_add_sinotruck_referral_system.sql` | Add column, table, and trigger |
| `src/components/sinotruck/SinotruckQuotationForm.tsx` | Add referral agent selector UI and state |
| `src/components/special-hire/ReferralAgentsManagement.tsx` | Query all 4 commission tables for stats |
| `src/components/special-hire/ReferralAgentHistoryModal.tsx` | Fetch records from all 4 modules with source indicator |
| `src/integrations/supabase/types.ts` | Update generated types |

---

## Technical Details

### Why Only 2 Agents Have Records

Based on database evidence:
- **Mr. Suranga**: 2 Yutong referrals (confirmed quotations worth LKR 108M total, earning LKR 3.25M commission)
- **Imesh Perera**: 1 Yutong referral (confirmed quotation worth LKR 38.25M, earning LKR 1.15M commission)
- **Other 15 agents**: No confirmed quotations linked to them yet

The stats ARE accurate for Yutong - they show in `total_referrals` and `total_commission_earned`. But the "Pending" and "Paid Out" columns show LKR 0 because those only query Special Hire's `referral_commission_payments` table.

### Commission Rate Consistency

All modules use 3% default commission rate:
- Special Hire: Manual linking, uses agent's `default_commission_pct`
- Yutong: Trigger uses hardcoded 3%
- Light Vehicle: Trigger uses `COALESCE(ra.commission_rate, 1.5)` - may need update
- Sinotruck: Will use 3% default

---

## Verification Steps

After implementation:

1. **Create Sinotruck quotation with referral agent** - Confirm agent shows in dropdown
2. **Confirm Sinotruck quotation** - Verify commission record created automatically
3. **Check Referral Agents page stats** - Should show combined totals from all modules
4. **View agent history** - Should show records from all 4 modules with source badges
5. **Database validation** - Run query to verify all commission tables have correct data
