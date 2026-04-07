
Fix: Public complaint form still fails to submit, and Date/Time must be mandatory.

1. Fix the real submit blocker: public insert RLS
- Add a new Supabase migration to replace the current public INSERT policy on `feedback_complaints`.
- Keep staff insert access as-is.
- Change the public branch to allow true unauthenticated complaint inserts using row rules instead of relying only on `auth.role() = 'anon'`, because Supabase logs show the current policy is still rejecting rows:
  - `reported_by IS NULL`
  - `type = 'complaint'`
  - `status = 'new'`
  - `escalation_level = 1`
  - `related_persons` includes `customer_phone`, `incident_date`, and `incident_time`

2. Make Date and Time required in the public form
- Update `src/lib/validation.ts` so `incidentDate` and `incidentTime` are required with clear validation messages.
- Update `src/components/complaints/PublicComplaintForm.tsx` to mark both inputs as required in the UI.

3. Make the submit path more reliable
- In `PublicComplaintForm.tsx`, use a freshly created anonymous Supabase client for submission instead of the shared instance.
- Keep the client-generated complaint reference ID.
- Show the actual insert error message in the toast/log instead of only showing a generic failure message.

4. Keep the current storage model
- No new DB columns are needed.
- Date and time will continue to be stored inside `related_persons`, but now they will be enforced both in the form and in the public insert policy.

Technical details
- Current code issue 1: `incidentDate` and `incidentTime` are still optional in `publicComplaintSchema`.
- Current code issue 2: Supabase logs show `new row violates row-level security policy for table "feedback_complaints"`.
- Important scope: make date/time mandatory for the public complaint flow only, so internal staff complaint creation does not break.

Files
- New migration: update public `feedback_complaints` INSERT policy
- Modify: `src/lib/validation.ts`
- Modify: `src/components/complaints/PublicComplaintForm.tsx`

Result
- Public complaints will submit successfully.
- Date and time will be mandatory.
- If submission fails again, the UI will show the real reason instead of a generic error.
