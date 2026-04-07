

# Fix: Public Complaint Form Submission Failing (RLS)

## Root Cause

The INSERT RLS policy correctly allows `anon` role to insert. However, the code does `.select('id').single()` after the insert, which triggers a SELECT query. The SELECT policy only allows `authenticated` users — so the anon user can insert the row but can't read it back, causing the entire operation to fail.

## Fix

### Modify `src/components/complaints/PublicComplaintForm.tsx`
- Remove `.select('id').single()` from the insert call — anon users don't need to read back the row
- Generate the reference ID client-side using a UUID or timestamp instead of relying on the returned row ID
- Keep the success flow working with the client-generated reference

This is a one-file fix, no migration needed.

