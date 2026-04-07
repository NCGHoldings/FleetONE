

# Remove 20-Character Minimum from Public Complaint Form Description

## Problem
The `description` field in the public complaint form requires a minimum of 20 characters, which is too restrictive for users submitting quick feedback.

## Fix

### Modify `src/lib/validation.ts`
- Line 16: Change `.min(20, ...)` to `.min(1, 'Description is required')` — remove the 20-character minimum, just require it to be non-empty

One-line change, one file.

