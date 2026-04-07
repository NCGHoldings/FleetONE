
Fix: Complaint document upload is blocked by storage RLS

Root cause
- The shared uploader (`src/components/documents/DocumentUpload.tsx`) stores files in the `documents` bucket using this path format:
  `linkedTable/linkedRowId/fileName`
- On the Complaints page, that becomes:
  `feedback_complaints/<complaintId>/<fileName>`
- The live `storage.objects` policies currently allow only specific `documents` bucket prefixes like `health-checks/%` and `payments/%`.
- There is no active storage policy for `feedback_complaints/%`, so Storage rejects the upload with `new row violates row-level security policy`.
- The UI is not the main problem here; the metadata insert already sends `uploaded_by: user.id`, which matches the current owner-based `public.documents` insert policy.

Plan
1. Add one Supabase migration to fix `documents` bucket access
   - Create authenticated `INSERT`, `SELECT`, `UPDATE`, and `DELETE` policies on `storage.objects`
   - Limit them to the module prefixes used by the shared uploader:
     - `feedback_complaints/%`
     - `insurance_records/%`
     - `staff_registry/%`
   - Keep `payments/%` and `health-checks/%` rules unchanged so this fix does not overexpose other files

2. Keep the React upload component unchanged
   - No path-generation bug was found in `src/components/documents/DocumentUpload.tsx`
   - It can keep using:
     `\${linkedTable}/\${linkedRowId}/\${fileName}`

3. Clean up policy drift safely
   - The live DB policies do not fully match the older migration files
   - In the new migration, use explicit policy names and drop/recreate only the relevant `documents` bucket policies for these module prefixes to avoid duplicate or conflicting behavior

4. Verify the full complaint document flow after the fix
   - Upload a document from the Complaints page
   - Confirm it appears in the complaint’s document list
   - Confirm preview/download works
   - Confirm delete works for the uploader/admin

Technical details
- Complaint page usage: `src/pages/Complaints.tsx`
- Shared uploader: `src/components/documents/DocumentUpload.tsx`
- Main backend fix: new migration updating `storage.objects` RLS for the `documents` bucket

Result
- Complaint documents will upload successfully
- The same shared uploader will also work for the current Insurance and Staff document screens
- Existing restricted folders inside the `documents` bucket remain protected
