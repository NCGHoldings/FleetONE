# FleetONE Quick Fix Reference Guide
**Last Updated:** May 14, 2026

---

## 🚀 QUICK START - WHAT TO DO NOW

### This Week (May 14-20)
```
Priority 1: Review FIX_PLAN_2026.md with team
Priority 2: Allocate resources (2 devs, 1 QA, 1 DevOps)
Priority 3: Start Critical Fixes:
  - DigitalOcean backup encryption
  - TypeScript strict mode (core modules)
  - Security hardening
```

### Next Week (May 21-27)
```
Priority 1: Complete Critical Fixes
Priority 2: Begin Accounting Phase 1
Priority 3: Set up monitoring & dashboards
```

---

## 📊 INFRASTRUCTURE STATUS SUMMARY

| Component | Status | Priority | Action |
|-----------|--------|----------|--------|
| **DigitalOcean Backups** | ✅ Working | HIGH | Add encryption & replication |
| **TypeScript** | ⚠️ Loose | HIGH | Enable strict mode |
| **Security** | ⚠️ Partial | CRITICAL | Harden RLS & add rate limiting |
| **Testing** | ⚠️ Partial | HIGH | Increase coverage to 80%+ |
| **Accounting** | ⚠️ Foundation | HIGH | Complete Phase 1-5 (400 days) |
| **Monitoring** | ⚠️ Basic | MEDIUM | Add Sentry & LogRocket |
| **Documentation** | ⚠️ Partial | MEDIUM | Complete API & runbooks |

---

## 🔴 CRITICAL FIXES (Week 1-2)

### 1. DigitalOcean Backup Encryption
**Effort:** 2 hours  
**Impact:** HIGH

```bash
# Enable encryption on backup bucket
aws s3api put-bucket-encryption \
  --bucket ncg-db-backup \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --endpoint-url https://sgp1.digitaloceanspaces.com

# Verify
aws s3api get-bucket-encryption \
  --bucket ncg-db-backup \
  --endpoint-url https://sgp1.digitaloceanspaces.com
```

**Files to Update:**
- `.github/workflows/db-backup.yml` - Add encryption verification step

---

### 2. TypeScript Strict Mode
**Effort:** 40 hours  
**Impact:** HIGH

```json
// tsconfig.json - Update to:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Modules to Fix (Priority Order):**
1. `src/lib/gl-posting-utils.ts`
2. `src/hooks/useNumbering.ts`
3. `src/hooks/useCustomerBridge.ts`
4. `src/lib/supabase.ts`
5. `src/hooks/useAuth.ts`

**Command:**
```bash
npm run type-check  # Run after each fix
```

---

### 3. Security Hardening
**Effort:** 36 hours  
**Impact:** CRITICAL

#### 3.1 RLS Policy Audit
```sql
-- Review all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
ORDER BY schemaname, tablename;

-- Test policy bypass
SELECT * FROM journal_entries WHERE company_id != current_user_company_id;
-- Should return 0 rows
```

#### 3.2 Rate Limiting
```typescript
// src/lib/rate-limit.ts
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (userId: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => now - t < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return false; // Rate limited
    }
    
    recentRequests.push(now);
    requests.set(userId, recentRequests);
    return true;
  };
};
```

#### 3.3 Request Validation
```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const journalEntrySchema = z.object({
  company_id: z.string().uuid(),
  reference: z.string().min(1).max(50),
  description: z.string().max(500),
  je_date: z.string().datetime(),
  lines: z.array(z.object({
    account_id: z.string().uuid(),
    debit: z.number().min(0),
    credit: z.number().min(0),
  })),
});

// Usage in API
export const validateJournalEntry = (data: unknown) => {
  return journalEntrySchema.parse(data);
};
```

---

## 🟠 HIGH PRIORITY FIXES (Week 3-6)

### 4. Accounting Phase 1 (80 days)

#### 4.1 Multi-Currency Support
```sql
-- Create currency tables
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) UNIQUE NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency_id UUID REFERENCES currencies,
  to_currency_id UUID REFERENCES currencies,
  rate DECIMAL(18,6) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency_id, to_currency_id, effective_date)
);

-- Add to journal_entry_lines
ALTER TABLE journal_entry_lines ADD COLUMN currency_id UUID REFERENCES currencies;
ALTER TABLE journal_entry_lines ADD COLUMN amount_in_currency DECIMAL(18,2);
ALTER TABLE journal_entry_lines ADD COLUMN exchange_rate DECIMAL(18,6);
```

#### 4.2 Recurring Journal Entries
```sql
CREATE TABLE recurring_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies,
  template_je_id UUID REFERENCES journal_entries,
  frequency VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users
);

-- Trigger to auto-create journal entries
CREATE OR REPLACE FUNCTION process_recurring_journal_entries()
RETURNS void AS $$
BEGIN
  INSERT INTO journal_entries (company_id, reference, description, je_date, created_by)
  SELECT 
    rje.company_id,
    'REC-' || rje.id || '-' || NOW()::DATE,
    'Recurring: ' || je.description,
    NOW()::DATE,
    rje.created_by
  FROM recurring_journal_entries rje
  JOIN journal_entries je ON rje.template_je_id = je.id
  WHERE rje.is_active = TRUE
    AND rje.next_run_date <= NOW()::DATE;
  
  -- Update next_run_date
  UPDATE recurring_journal_entries
  SET next_run_date = CASE frequency
    WHEN 'DAILY' THEN next_run_date + INTERVAL '1 day'
    WHEN 'WEEKLY' THEN next_run_date + INTERVAL '7 days'
    WHEN 'MONTHLY' THEN next_run_date + INTERVAL '1 month'
    WHEN 'QUARTERLY' THEN next_run_date + INTERVAL '3 months'
    WHEN 'YEARLY' THEN next_run_date + INTERVAL '1 year'
  END
  WHERE is_active = TRUE AND next_run_date <= NOW()::DATE;
END;
$$ LANGUAGE plpgsql;
```

#### 4.3 Financial Reports
```typescript
// src/hooks/useFinancialReports.ts
export const useTrialBalance = (companyId: string, periodId: string) => {
  return useQuery({
    queryKey: ['trial-balance', companyId, periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select(`
          id, code, name, account_type,
          journal_entry_lines!inner(debit, credit)
        `)
        .eq('company_id', companyId)
        .eq('journal_entry_lines.period_id', periodId);
      
      if (error) throw error;
      
      return data.map(account => ({
        code: account.code,
        name: account.name,
        type: account.account_type,
        debit: account.journal_entry_lines.reduce((sum, line) => sum + line.debit, 0),
        credit: account.journal_entry_lines.reduce((sum, line) => sum + line.credit, 0),
      }));
    },
  });
};
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Week 1-2: Critical Fixes
- [ ] DO Spaces encryption enabled
- [ ] TypeScript strict mode enabled (core modules)
- [ ] RLS policies audited
- [ ] Rate limiting implemented
- [ ] Request validation added
- [ ] All tests passing

### Week 3-4: Accounting Phase 1
- [ ] Multi-currency support complete
- [ ] Recurring journal entries working
- [ ] Financial reports generating
- [ ] Period locking functional
- [ ] 80%+ test coverage

### Week 5-6: Accounting Phase 2
- [ ] Customer/vendor masters enhanced
- [ ] Receipt & payment processing working
- [ ] Ageing reports accurate
- [ ] Bank reconciliation functional
- [ ] All AR/AP workflows tested

### Week 7-8: Code Quality
- [ ] Unit tests (50+ files)
- [ ] Integration tests (10+ files)
- [ ] E2E tests (5+ files)
- [ ] Error boundary implemented
- [ ] Sentry integration complete

---

## 🔧 COMMON COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint check
npm run type-check       # TypeScript check
npm run test             # Run tests
npm run test:coverage    # Coverage report

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run db:backup        # Manual backup

# Deployment
git push origin main                    # Deploy to staging
git push origin main:deploy/live -f     # Deploy to production
npm run lovable-sync                    # Sync to Lovable

# Git
git status               # Check status
git add .                # Stage changes
git commit -m "message"  # Commit
git push origin branch   # Push to remote
```

---

## 🚨 EMERGENCY PROCEDURES

### Database Corruption
```bash
# 1. Stop application
docker stop fleetone

# 2. Download latest backup
aws s3 cp s3://ncg-db-backup/fleetone/supabase-backup-LATEST.dump \
  backup.dump \
  --endpoint-url https://sgp1.digitaloceanspaces.com

# 3. Restore
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges --clean --if-exists backup.dump

# 4. Restart application
docker start fleetone

# 5. Verify
curl https://fleetone.ncg.lk/api/health
```

### Application Crash
```bash
# 1. Check logs
docker logs fleetone | tail -100

# 2. Rollback to previous release
ln -sfn /var/www/fleetone/releases/production/20260513_000000 \
  /var/www/fleetone/FleetONE

# 3. Reload Nginx
sudo nginx -s reload

# 4. Verify
curl https://fleetone.ncg.lk
```

### Performance Degradation
```bash
# 1. Check database connections
SELECT count(*) FROM pg_stat_activity;

# 2. Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '1 hour';

# 3. Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM journal_entries WHERE company_id = 'xxx';

# 4. Rebuild indexes
REINDEX TABLE journal_entries;
```

---

## 📞 ESCALATION CONTACTS

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Critical (Down) | DevOps Lead | 15 min |
| High (Degraded) | Tech Lead | 1 hour |
| Medium (Bug) | Dev Team | 4 hours |
| Low (Enhancement) | Product Manager | 1 day |

---

## 📚 DOCUMENTATION LINKS

- **Full Fix Plan:** `FIX_PLAN_2026.md`
- **Backup Analysis:** `DIGITALOCEAN_BACKUP_ANALYSIS.md`
- **Agent Rules:** `.agent/rules.md`
- **System Context:** `.agent/context.md`
- **Accounting Gaps:** `ACCOUNTING_GAP_ANALYSIS.md`

---

**Version:** 1.0  
**Last Updated:** May 14, 2026  
**Next Review:** May 21, 2026
