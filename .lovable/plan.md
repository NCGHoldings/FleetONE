

# Increase Logo Size in Document Templates

## Change

**File: `src/lib/document-template-seeder.ts`**

Increase the logo from `180px / 60px` to `220px / 75px` across all template occurrences (there are 5 instances in the file). This gives a noticeably larger, more prominent logo while still fitting the header layout.

The change is a simple find-and-replace of:
- `width: 180px` → `width: 220px`
- `max-height: 60px` → `max-height: 75px`

After deploying, go to **Settings → Document Templates → Replace All Templates** to update stored templates.

