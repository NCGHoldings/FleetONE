

# Add Remarks & Feedback System to Special Hire Calendar View

## What You Get

Each hire card in the calendar view will show:
- A small preview of the latest remark (e.g., "Customer called, confirmed 3pm pickup")
- A speech bubble icon with remark count badge
- Click to open a full remark history dialog — add new remarks with type tags (Call Note, Customer Feedback, Internal Note), timestamps, and user attribution

## Database

**New table: `special_hire_remarks`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| quotation_id | uuid FK → special_hire_quotations | Links to the hire |
| remark_type | text | 'call_note', 'customer_feedback', 'internal_note', 'follow_up' |
| content | text | The remark text |
| created_by | uuid | User who added it |
| created_by_name | text | Display name snapshot |
| created_at | timestamptz | Auto timestamp |

RLS: Authenticated users can select/insert. No public access.

## UI Changes

### 1. Calendar Card (SpecialHireCalendarView.tsx)

On each hire card, below the financial row:
- Show a `MessageSquare` icon with count badge (e.g., "3")
- If remarks exist, show the latest remark text truncated to 1 line with timestamp
- Clicking the remark area opens the Remark Dialog (stops card click propagation)

### 2. New Component: SpecialHireRemarkDialog.tsx

A Dialog containing:
- **Header**: Quotation number + customer name
- **Remark list**: Scrollable list of all remarks, newest first. Each shows: type badge (color-coded), content, user name, relative timestamp
- **Add remark form**: At the bottom — remark type selector (dropdown) + textarea + "Add" button
- Uses `useQuery` to fetch remarks, `useMutation` to insert

### 3. Data Fetching

- Batch-load remark counts + latest remark per quotation when loading the day's quotations (single query with `quotation_id` IN list)
- Dialog fetches full history on open

## Files
- **New migration**: Create `special_hire_remarks` table with RLS
- **New**: `src/components/special-hire/SpecialHireRemarkDialog.tsx` — remark history + add form
- **Modify**: `src/components/special-hire/SpecialHireCalendarView.tsx` — add remark preview on cards + dialog trigger

