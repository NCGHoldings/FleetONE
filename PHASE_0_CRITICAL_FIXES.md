# Phase 0: Critical Fixes (Week 1-2)
**Duration:** 2 weeks  
**Effort:** 80 developer-days  
**Cost:** $12,000  
**Priority:** CRITICAL  
**Status:** NOT STARTED

---

## 📋 PHASE OVERVIEW

### Goals
1. ✅ Secure backup infrastructure (encryption, replication)
2. ✅ Enable TypeScript strict mode (core modules)
3. ✅ Harden security (RLS, rate limiting, validation)
4. ✅ Establish foundation for subsequent phases

### Success Criteria
- [ ] All backups encrypted with AES-256
- [ ] TypeScript strict mode enabled (core modules)
- [ ] RLS policies audited & hardened
- [ ] Rate limiting implemented
- [ ] Request validation added
- [ ] All tests passing (80%+ coverage)

### Team Allocation
- **2 Developers** (40 hours each)
- **1 QA Engineer** (20 hours)
- **1 DevOps Engineer** (20 hours)

---

## 🎯 DELIVERABLES

### 1. DigitalOcean Backup Encryption
**Owner:** DevOps Engineer  
**Effort:** 2 hours  
**Priority:** CRITICAL

#### Tasks
- [ ] Enable AES-256 encryption on ncg-db-backup bucket
- [ ] Enable object versioning
- [ ] Set object lock (GOVERNANCE mode, 90 days)
- [ ] Update backup workflow to verify encryption
- [ ] Test encryption verification
- [ ] Document encryption procedures

#### Implementation Steps

**Step 1: Enable Encryption**
```bash
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
```

**Step 2: Enable Versioning**
```bash
aws s3api put-bucket-versioning \
  --bucket ncg-db-backup \
  --versioning-configuration Status=Enabled \
  --endpoint-url https://sgp1.digitaloceanspaces.com
```

**Step 3: Set Object Lock**
```bash
aws s3api put-object-lock-configuration \
  --bucket ncg-db-backup \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 90
      }
    }
  }' \
  --endpoint-url https://sgp1.digitaloceanspaces.com
```

**Step 4: Update Backup Workflow**
```yaml
# .github/workflows/db-backup.yml - Add verification step
- name: Verify Encryption
  run: |
    aws s3api head-object \
      --bucket ncg-db-backup \
      --key "fleetone/$BACKUP_FILE" \
      --endpoint-url "$DO_SPACE_ENDPOINT" | \
      grep -q "ServerSideEncryption" && echo "✅ Encrypted"
```

#### Acceptance Criteria
- [ ] Encryption enabled on bucket
- [ ] Versioning enabled
- [ ] Object lock configured
- [ ] Backup workflow updated
- [ ] Verification step passing
- [ ] Documentation complete

#### Testing
```bash
# Verify encryption
aws s3api get-bucket-encryption \
  --bucket ncg-db-backup \
  --endpoint-url https://sgp1.digitaloceanspaces.com

# Verify versioning
aws s3api get-bucket-versioning \
  --bucket ncg-db-backup \
  --endpoint-url https://sgp1.digitaloceanspaces.com

# Verify object lock
aws s3api get-object-lock-configuration \
  --bucket ncg-db-backup \
  --endpoint-url https://sgp1.digitaloceanspaces.com
```

---

### 2. TypeScript Strict Mode (Core Modules)
**Owner:** Lead Developer  
**Effort:** 40 hours  
**Priority:** HIGH

#### Tasks
- [ ] Update tsconfig.json with strict mode
- [ ] Fix type errors in core modules
- [ ] Add pre-commit hook for type checking
- [ ] Run full type check
- [ ] Update CI/CD pipeline

#### Core Modules to Fix (Priority Order)
1. `src/lib/gl-posting-utils.ts` (Finance core)
2. `src/hooks/useNumbering.ts` (Document numbering)
3. `src/hooks/useCustomerBridge.ts` (Customer sync)
4. `src/lib/supabase.ts` (Database client)
5. `src/hooks/useAuth.ts` (Authentication)

#### Implementation Steps

**Step 1: Update tsconfig.json**
```json
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

**Step 2: Fix Core Modules**

For each module:
1. Run `npm run type-check`
2. Fix errors one by one
3. Add proper type annotations
4. Test functionality
5. Commit changes

**Example: gl-posting-utils.ts**
```typescript
// Before (loose)
export const postJournalEntry = async (entry) => {
  const result = await supabase
    .from('journal_entries')
    .insert(entry);
  return result;
};

// After (strict)
import { Database } from '@/types/supabase';

type JournalEntry = Database['public']['Tables']['journal_entries']['Insert'];

export const postJournalEntry = async (
  entry: JournalEntry
): Promise<{ data: JournalEntry | null; error: Error | null }> => {
  const result = await supabase
    .from('journal_entries')
    .insert(entry);
  
  if (result.error) {
    return { data: null, error: result.error };
  }
  
  return { data: result.data?.[0] ?? null, error: null };
};
```

**Step 3: Add Pre-commit Hook**
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run type-check
```

**Step 4: Update CI/CD**
```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run type-check
```

#### Acceptance Criteria
- [ ] tsconfig.json updated with strict mode
- [ ] All core modules have proper types
- [ ] No type errors on `npm run type-check`
- [ ] Pre-commit hook working
- [ ] CI/CD pipeline updated
- [ ] All tests passing

#### Testing
```bash
npm run type-check
npm run build
npm run test
```

---

### 3. Security Hardening
**Owner:** Lead Developer + DevOps  
**Effort:** 36 hours  
**Priority:** CRITICAL

#### 3.1 RLS Policy Audit (8 hours)
**Tasks:**
- [ ] Review all RLS policies (200+ tables)
- [ ] Ensure company_id isolation
- [ ] Add role-based column-level security
- [ ] Test policy bypass scenarios
- [ ] Document policy matrix

**Implementation:**
```sql
-- Audit all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
ORDER BY schemaname, tablename;

-- Test company isolation
SELECT * FROM journal_entries 
WHERE company_id != current_user_company_id;
-- Should return 0 rows

-- Test role-based access
SELECT * FROM chart_of_accounts 
WHERE company_id = current_user_company_id 
  AND NOT has_role('finance');
-- Should return 0 rows for non-finance users
```

#### 3.2 Rate Limiting (12 hours)
**Tasks:**
- [ ] Implement rate limiting middleware
- [ ] Add per-user quotas
- [ ] Add Telegram alerts for abuse
- [ ] Document rate limit policies

**Implementation:**
```typescript
// src/lib/rate-limit.ts
import { createClient } from '@supabase/supabase-js';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: any) => string;
}

export const createRateLimiter = (config: RateLimitConfig) => {
  const requests = new Map<string, number[]>();
  
  return (req: any): boolean => {
    const key = config.keyGenerator(req);
    const now = Date.now();
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(t => now - t < config.windowMs);
    
    if (recentRequests.length >= config.maxRequests) {
      // Log abuse attempt
      console.warn(`Rate limit exceeded for ${key}`);
      return false;
    }
    
    recentRequests.push(now);
    requests.set(key, recentRequests);
    return true;
  };
};

// Usage in API
export const journalEntryLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyGenerator: (req) => req.user.id,
});
```

#### 3.3 Request Validation (16 hours)
**Tasks:**
- [ ] Add Zod schemas to all API endpoints
- [ ] Validate input types and ranges
- [ ] Add CORS hardening
- [ ] Document API contracts

**Implementation:**
```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const journalEntrySchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  reference: z.string().min(1).max(50),
  description: z.string().max(500),
  je_date: z.string().datetime(),
  lines: z.array(z.object({
    account_id: z.string().uuid('Invalid account ID'),
    debit: z.number().min(0).max(999999999),
    credit: z.number().min(0).max(999999999),
  })).min(2, 'At least 2 lines required'),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

// Validation middleware
export const validateJournalEntry = (data: unknown): JournalEntry => {
  try {
    return journalEntrySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors[0].message}`);
    }
    throw error;
  }
};
```

#### Acceptance Criteria
- [ ] All RLS policies reviewed & hardened
- [ ] Rate limiting implemented & tested
- [ ] Request validation on all endpoints
- [ ] CORS hardening applied
- [ ] No security vulnerabilities (Snyk)
- [ ] Documentation complete

#### Testing
```bash
# Run security audit
npm audit
snyk test

# Test rate limiting
curl -X POST http://localhost:8080/api/journal-entries \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' # Should fail validation

# Test RLS bypass
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM journal_entries WHERE company_id != current_user_company_id;"
# Should return 0 rows
```

---

### 4. Code Quality & Testing
**Owner:** QA Engineer  
**Effort:** 20 hours  
**Priority:** HIGH

#### Tasks
- [ ] Add unit tests for core modules (15 hours)
- [ ] Add integration tests (5 hours)
- [ ] Achieve 80%+ coverage
- [ ] Set up coverage reporting

#### Test Files to Create
```
src/hooks/__tests__/
  ├─ useGLPosting.test.ts
  ├─ useNumbering.test.ts
  ├─ useCustomerBridge.test.ts
  └─ useAuth.test.ts

src/lib/__tests__/
  ├─ gl-posting-utils.test.ts
  ├─ validation.test.ts
  └─ rate-limit.test.ts

e2e/
  ├─ accounting.spec.ts
  └─ security.spec.ts
```

#### Example Test
```typescript
// src/lib/__tests__/gl-posting-utils.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { postJournalEntry } from '../gl-posting-utils';

describe('GL Posting Utils', () => {
  describe('postJournalEntry', () => {
    it('should post valid journal entry', async () => {
      const entry = {
        company_id: 'a0000000-0000-0000-0000-000000000001',
        reference: 'JE-2026-000001',
        description: 'Test entry',
        je_date: new Date().toISOString(),
        lines: [
          { account_id: 'acc-1', debit: 100, credit: 0 },
          { account_id: 'acc-2', debit: 0, credit: 100 },
        ],
      };
      
      const result = await postJournalEntry(entry);
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should reject unbalanced entry', async () => {
      const entry = {
        company_id: 'a0000000-0000-0000-0000-000000000001',
        reference: 'JE-2026-000002',
        description: 'Unbalanced entry',
        je_date: new Date().toISOString(),
        lines: [
          { account_id: 'acc-1', debit: 100, credit: 0 },
          { account_id: 'acc-2', debit: 0, credit: 50 }, // Unbalanced
        ],
      };
      
      const result = await postJournalEntry(entry);
      expect(result.error).toBeDefined();
    });
  });
});
```

#### Acceptance Criteria
- [ ] 80%+ test coverage
- [ ] All core modules tested
- [ ] Integration tests passing
- [ ] Coverage report generated
- [ ] CI/CD updated with coverage check

---

## 📅 WEEK-BY-WEEK BREAKDOWN

### Week 1: Days 1-5

**Monday (Day 1)**
- [ ] Team kickoff meeting
- [ ] Review Phase 0 plan
- [ ] Set up development environment
- [ ] Create feature branches

**Tuesday-Wednesday (Days 2-3)**
- [ ] Enable backup encryption (DevOps)
- [ ] Start TypeScript strict mode (Dev 1)
- [ ] Begin RLS policy audit (Dev 2)

**Thursday-Friday (Days 4-5)**
- [ ] Complete backup encryption
- [ ] Fix core TypeScript modules
- [ ] Complete RLS audit
- [ ] Begin rate limiting implementation

### Week 2: Days 6-10

**Monday-Tuesday (Days 6-7)**
- [ ] Complete TypeScript strict mode
- [ ] Implement rate limiting
- [ ] Add request validation

**Wednesday-Thursday (Days 8-9)**
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Security testing

**Friday (Day 10)**
- [ ] Final testing & verification
- [ ] Code review & merge
- [ ] Phase 0 completion review

---

## 🔄 DEPENDENCIES & BLOCKERS

### Dependencies
- None (Phase 0 is independent)

### Potential Blockers
1. **TypeScript compilation errors** → Allocate extra time for fixes
2. **RLS policy complexity** → Consult with database team
3. **Rate limiting performance** → Load test before deployment

### Mitigation
- Daily standup to identify blockers
- Escalation path for critical issues
- Rollback plan if issues arise

---

## ✅ ACCEPTANCE CRITERIA

### Backup Encryption
- [ ] AES-256 encryption enabled
- [ ] Versioning enabled
- [ ] Object lock configured
- [ ] Verification step in workflow
- [ ] Documentation complete

### TypeScript Strict Mode
- [ ] tsconfig.json updated
- [ ] Core modules fixed
- [ ] No type errors
- [ ] Pre-commit hook working
- [ ] CI/CD updated

### Security Hardening
- [ ] RLS policies hardened
- [ ] Rate limiting working
- [ ] Request validation active
- [ ] No security vulnerabilities
- [ ] Documentation complete

### Code Quality
- [ ] 80%+ test coverage
- [ ] All tests passing
- [ ] Coverage report generated
- [ ] CI/CD updated

---

## 🧪 TESTING STRATEGY

### Unit Tests
- Test each function in isolation
- Mock external dependencies
- Target 80%+ coverage

### Integration Tests
- Test module interactions
- Use test database
- Verify GL posting flows

### Security Tests
- Test RLS policy bypass
- Test rate limiting
- Test request validation

### Performance Tests
- Measure backup encryption time
- Measure type-check time
- Measure test execution time

---

## 📊 METRICS & MONITORING

### Success Metrics
- [ ] 0 type errors
- [ ] 0 security vulnerabilities
- [ ] 80%+ test coverage
- [ ] 100% backup encryption
- [ ] 0 rate limit bypasses

### Monitoring
- Daily standup (15 min)
- Code review (continuous)
- Test results (automated)
- Security scan (automated)

---

## 📝 DOCUMENTATION

### To Create
- [ ] Backup encryption runbook
- [ ] TypeScript migration guide
- [ ] Security hardening checklist
- [ ] Rate limiting documentation
- [ ] Test coverage report

### To Update
- [ ] `.agent/rules.md` - Add new guardrails
- [ ] `.agent/context.md` - Update system context
- [ ] `README.md` - Add security section

---

## 🚀 DEPLOYMENT

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Code review approved
- [ ] Security scan passed
- [ ] Documentation complete
- [ ] Team trained

### Deployment Steps
1. Merge to main branch
2. Deploy to staging
3. Run smoke tests
4. Deploy to production
5. Monitor for issues

### Rollback Plan
- Keep previous version available
- Atomic symlink pivot
- Verify health checks
- Notify stakeholders

---

## 📞 SUPPORT & ESCALATION

### Daily Standup
- Time: 9:00 AM UTC
- Duration: 15 minutes
- Attendees: All team members

### Escalation Path
1. Team Lead (blockers)
2. Technical Lead (architecture)
3. Project Lead (resources)
4. Executive Sponsor (critical issues)

### Communication
- Slack: #fleetone-fixes
- Email: Weekly status report
- GitHub: Issues & PRs

---

## 📋 PHASE 0 CHECKLIST

### Pre-Phase
- [ ] Team allocated
- [ ] Environment set up
- [ ] Plan reviewed & approved
- [ ] Success criteria agreed

### During Phase
- [ ] Daily standups
- [ ] Code reviews
- [ ] Testing
- [ ] Documentation

### Post-Phase
- [ ] All deliverables complete
- [ ] Acceptance criteria met
- [ ] Documentation finalized
- [ ] Team debriefed
- [ ] Lessons learned documented

---

## 🎯 NEXT PHASE

After Phase 0 completion:
- **Phase 1:** Core Accounting (Week 3-6)
- **Phase 2:** AR/AP Enhancement (Week 7-10)
- **Phase 3:** Inventory & Procurement (Week 11-14)
- **Phase 4:** Advanced Features (Week 15-18)
- **Phase 5:** Automation & Controls (Week 19-22)

---

**Phase 0 Plan Version:** 1.0  
**Created:** May 14, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Next Review:** May 21, 2026
