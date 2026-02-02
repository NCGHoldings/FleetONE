

# Remove CI/CD Pipeline to Unblock Code Push

## Problem
The CI/CD pipeline and GitHub Ruleset are blocking your code push. You want to push your Special Hire overtime fixes now and set up CI/CD later.

## Solution
Delete the CI/CD workflow file so GitHub won't run any checks, allowing you to push directly.

## Files to Delete

| File | Reason |
|------|--------|
| `.github/workflows/ci.yml` | Remove CI pipeline that runs on push/PR |

## What Happens After

1. **Immediate**: No more automated checks will run on push or PR
2. **You can push**: Your Special Hire overtime fixes will go through
3. **Later**: When ready, you can recreate the CI/CD pipeline

## Also Recommended (Manual Step on GitHub)

After I delete the workflow file, you should also:
1. Go to **GitHub → Settings → Rules → Rulesets**
2. Delete the "Main Branch Protection" ruleset
3. This removes the requirement for status checks to pass

This will fully unblock your pushes.

