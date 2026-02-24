---
description: Update ANTIGRAVITY_ncgCHANGELOG.md after making changes
---

# Update External Changelog

After completing any development work and before committing:

1. Read `ANTIGRAVITY_ncgCHANGELOG.md` in the repo root to understand existing entries
2. Add a new entry under today's date section (create one if it doesn't exist) with:
   - A descriptive title with the commit hash (once known)
   - **Files Modified:** list with brief description of what changed in each file
   - Any architecture notes that Lovable needs to know
3. Update the `Last Updated` date in the header
4. Include the changelog update in the same commit as the code changes

## Entry Format

```markdown
### ✅ [Short Description] (commit: `abc1234`)
**Files Modified:**
- `path/to/file.tsx` — What changed and why
- `path/to/other.ts` — What changed and why
```

## Important Rules
- Always add new entries at the TOP of the date section (newest first)
- Keep entries concise but specific enough for another AI tool to understand
- Include any new constants, table schemas, or architectural decisions in the "Key Architecture Notes" section at the bottom
- If you modify a file that was previously documented, update the architecture notes if the change is significant
