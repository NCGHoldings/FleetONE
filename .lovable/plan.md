

# Fix Route Permit Document Upload + Add Change History

## What's Missing

1. **Document Upload button** shows "coming soon" toast instead of actually uploading files
2. **No change history** — when a permit is edited, there's no record of what changed

## Plan

### 1. Create `route_permit_change_history` table (SQL Migration)

New table to track every permit change:
- `id`, `permit_id` (FK to route_permits), `changed_by` (FK to auth.users), `changed_at`
- `change_type` (text: 'created', 'updated', 'renewed', 'status_change', 'document_uploaded')
- `changes` (jsonb: `{ field: "expiry_date", old: "2024-01-01", new: "2025-01-01" }`)
- `description` (text summary)
- RLS: authenticated can read, insert

### 2. Implement Document Upload for Route Permits

**In `src/pages/RoutePermits.tsx`**:
- Replace the "coming soon" toast (lines 509-518) with a file input dialog
- Upload file to Supabase Storage bucket `documents` under path `route-permits/{permitId}/{filename}`
- Insert row into `documents` table with `linked_table: 'route_permits'`, `linked_row_id: permit.id`, `tag: 'permit_document'`
- Log upload to `route_permit_change_history`

Add new state + dialog component inline:
- `showUploadDialog` boolean + `uploadPermitId` string
- File dropzone accepting image/*, application/pdf (max 10MB)
- On submit: upload to storage, insert to documents, record history, toast success

### 3. Record Change History on Every Permit Edit

**In `src/pages/RoutePermits.tsx` `handleSubmit()`**:
- Before updating, fetch the current permit data
- Diff old vs new values, build a `changes` jsonb array of `{ field, old_value, new_value }`
- Insert into `route_permit_change_history` with `change_type: 'updated'` (or `'created'` for new permits)

### 4. Display History + Documents in Details Modal

**In `src/components/route-permits/RoutePermitDetailsModal.tsx`**:
- Add two new cards at the bottom:

**Documents Card**: Query `documents` where `linked_table = 'route_permits' AND linked_row_id = permit.id`. Show file name, upload date, download button (signed URL).

**Change History Card**: Query `route_permit_change_history` where `permit_id = permit.id` ordered by `changed_at DESC`. Show timeline with change type badge, description, timestamp, and expandable field-level diffs.

### Files to Change

| File | What |
|---|---|
| SQL Migration | Create `route_permit_change_history` table with RLS |
| `src/pages/RoutePermits.tsx` | Add document upload dialog, record change history on create/edit |
| `src/components/route-permits/RoutePermitDetailsModal.tsx` | Add Documents and Change History sections |

