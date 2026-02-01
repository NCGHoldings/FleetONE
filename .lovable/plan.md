

# CI/CD Pipeline Implementation Plan

## Overview
Build a comprehensive CI/CD system using GitHub Actions that automatically tests, validates, and blocks breaking changes before they can be merged to your main branch.

## What This Will Do

| Check | Purpose | If Fails |
|-------|---------|----------|
| TypeScript Check | Catch type errors | Block merge |
| ESLint | Code quality issues | Block merge |
| Build | Verify app compiles | Block merge |
| Unit Tests | Test individual functions | Block merge |
| E2E Tests | Test full user flows | Block merge |

---

## Implementation

### 1. GitHub Actions Workflow

Create `.github/workflows/ci.yml` that runs on every push and pull request:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Install dependencies
      - TypeScript type-check
      - ESLint check
      - Build application
      
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - Run Vitest unit tests
      - Upload coverage report
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - Start dev server
      - Run Playwright tests
      - Upload failure screenshots
```

### 2. Unit Testing Setup (Vitest)

Add Vitest for fast unit testing:

**Files to Create:**
- `vitest.config.ts` - Vitest configuration
- `src/test/setup.ts` - Test environment setup

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  }
}
```

### 3. Example Unit Tests

Create tests for critical business logic:

```typescript
// src/lib/__tests__/gl-posting-utils.test.ts
describe('GL Posting Utils', () => {
  it('should validate debit equals credit', () => {
    // Test double-entry validation
  });
});
```

### 4. Branch Protection (GitHub Setup Required)

After CI is working, enable branch protection:
- Go to GitHub → Settings → Branches
- Add rule for `main` branch
- Require status checks to pass before merging
- Select: `validate`, `unit-tests`, `e2e-tests`

---

## How It Works

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Makes Changes                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Push to GitHub                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 GitHub Actions Triggered                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │TypeScript│  │  ESLint  │  │  Build   │  │  Tests   │        │
│  │  Check   │  │  Check   │  │  Check   │  │  Check   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
     ┌──────────────┐           ┌──────────────┐
     │  ALL PASSED  │           │  ANY FAILED  │
     │     ✅       │           │     ❌       │
     └──────┬───────┘           └──────┬───────┘
            │                          │
            ▼                          ▼
     ┌──────────────┐           ┌──────────────┐
     │ Merge Allowed│           │ Merge Blocked│
     │              │           │ Show Errors  │
     └──────────────┘           └──────────────┘
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | Create | Main CI/CD pipeline |
| `vitest.config.ts` | Create | Unit test configuration |
| `src/test/setup.ts` | Create | Test environment setup |
| `src/lib/__tests__/gl-posting-utils.test.ts` | Create | Example unit test |
| `package.json` | Modify | Add test scripts |
| `tsconfig.app.json` | Modify | Add vitest types |

---

## Error Display Example

When tests fail, GitHub will show:

```text
❌ CI/CD Pipeline - Failed

validate (1m 23s)
  ✅ Checkout
  ✅ Install dependencies
  ❌ TypeScript Check
     Error: src/components/Example.tsx(45,12)
     Type 'string' is not assignable to type 'number'

unit-tests (45s)
  ✅ Run tests
  
e2e-tests (2m 10s)
  ❌ Run Playwright tests
     Failed: Light Vehicle > Quotation form should submit
     Screenshot: artifacts/screenshot.png
```

---

## After Implementation

Once set up, you will need to:

1. **Enable Branch Protection on GitHub:**
   - Go to your repo → Settings → Branches
   - Add rule for `main` branch
   - Check "Require status checks to pass before merging"
   - Select all 3 jobs: `validate`, `unit-tests`, `e2e-tests`

2. **Flow for Safe Changes:**
   - Create a new branch for changes
   - Make your changes
   - Push to GitHub
   - CI runs automatically
   - If passes → merge allowed
   - If fails → merge blocked, fix errors first

