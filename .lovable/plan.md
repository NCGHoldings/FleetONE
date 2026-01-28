
# Company Access Management for Finance ERP

## Overview

Add flexible company visibility controls to the Staff Management page, allowing administrators to configure which companies each user can see in the Finance & Accounting ERP dropdown (CompanySwitcher).

## Current System Architecture

```text
Companies Hierarchy:
├── NCG Express (standalone)
└── NCG Holding (parent)
    ├── Light Vehicle Sales (LTV)
    ├── School Bus Operations (SBO)
    ├── Sinotruck Sales (SNT)
    ├── Special Hire (SPH)
    └── Yutong Sales (YUT)
```

Currently, all users see all companies in the dropdown. The `user_company_access` table exists but is not utilized.

## Solution Design

### 1. Database Schema
Use the existing `user_company_access` table with a new hook and modal to manage assignments:

| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid | The staff member |
| company_id | uuid | The company they can access |
| can_edit | boolean | Future: whether they can edit (not used yet) |
| created_at | timestamp | When access was granted |

### 2. Access Logic

**Default Behavior (no entries):**
- Super Admins: See all companies
- Admin/Supervisor/Finance roles: See all companies (management roles)
- Other roles: See no companies (zero-trust)

**When entries exist:**
- User only sees companies explicitly granted in `user_company_access`
- Parent company access DOES NOT automatically grant sub-company access
- Each company/sub-company must be explicitly assigned

### 3. UI Component: Company Access Modal

Add a new "Company Access" button to the Staff Management page (next to "Page Access") that opens a modal similar to the Page Access modal:

```text
┌─────────────────────────────────────────────────────────┐
│  Company Access — John Doe                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NCG Express                                            │
│  ─────────────────────────────────────────────────────  │
│  [ ] NCG Express                                        │
│                                                         │
│  NCG Holding                                            │
│  ─────────────────────────────────────────────────────  │
│  [ ] NCG Holding (All Data)    [Select All] [Clear]     │
│                                                         │
│     Sub-Companies:                                      │
│     [x] Light Vehicle Sales                             │
│     [x] School Bus Operations                           │
│     [ ] Sinotruck Sales                                 │
│     [x] Special Hire                                    │
│     [ ] Yutong Sales                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                            [Cancel]  [Save]             │
└─────────────────────────────────────────────────────────┘
```

### 4. CompanySwitcher Integration

Modify `CompanySwitcher` to filter companies based on user permissions:

- Fetch user's allowed companies from `user_company_access`
- Filter the dropdown to only show allowed companies
- If no explicit permissions exist, fall back to role-based defaults

## Implementation Steps

### Step 1: Create `useCompanyAccess` Hook
Create a new hook `src/hooks/useCompanyAccess.ts`:
- Fetch user's company access from `user_company_access`
- Provide `hasCompanyAccess(companyId)` function
- Provide methods to grant/revoke company access
- Handle save/upsert operations

### Step 2: Create Company Access Modal
Create `src/components/staff/CompanyAccessModal.tsx`:
- Display companies grouped by parent (NCG Express section, NCG Holding section)
- Show sub-companies indented under NCG Holding
- "Select All" / "Clear" buttons per group
- Checkboxes for each company with proper hierarchy display

### Step 3: Update StaffManagement Page
Add a "Company Access" button next to "Page Access" in the staff actions column:
- Only visible to Super Admins
- Opens CompanyAccessModal for the selected user

### Step 4: Update CompanyContext
Modify `src/contexts/CompanyContext.tsx`:
- Add new state for `allowedCompanyIds`
- Fetch user's allowed companies on auth state change
- Filter `companies` array based on permissions
- Expose `allowedCompanyIds` in context

### Step 5: Update CompanySwitcher
Modify `src/components/accounting/CompanySwitcher.tsx`:
- Use filtered companies from context
- Only render companies user has access to

## Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useCompanyAccess.ts` | Hook for company access management |
| `src/components/staff/CompanyAccessModal.tsx` | Modal UI for assigning companies |

## Files to Modify
| File | Changes |
|------|---------|
| `src/contexts/CompanyContext.tsx` | Filter companies based on user permissions |
| `src/components/accounting/CompanySwitcher.tsx` | Use filtered companies |
| `src/pages/StaffManagement.tsx` | Add Company Access button |

## Example Scenarios

### Scenario 1: NCG Express Only User
```
user_company_access entries:
- user_id: abc123, company_id: ncg_express_id
```
Result: User only sees "NCG Express" in dropdown

### Scenario 2: NCG Holding - School Bus & Special Hire
```
user_company_access entries:
- user_id: xyz789, company_id: ncg_holding_id
- user_id: xyz789, company_id: sbo_id
- user_id: xyz789, company_id: sph_id
```
Result: User sees NCG Holding parent + SBO and SPH sub-companies

### Scenario 3: Super Admin (no entries needed)
No entries in `user_company_access`
Result: User sees all companies (super_admin role bypass)

## Security Considerations

- RLS policies on `user_company_access` already exist (referenced in types)
- Super Admins bypass company restrictions
- Empty permissions = role-based default (not zero-access for managers)
- Changes are logged with `created_at` timestamp

## Technical Notes

- Uses existing `user_company_access` table (no schema changes needed)
- Follows same pattern as `PageAccessModal` for consistency
- Company permissions are separate from page permissions
- Both can be managed independently for maximum flexibility
