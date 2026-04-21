

# Make the AP Payment attachment 📎 actually openable

## What you're seeing today

The paperclip icon in the **Payment #** column lights up when `ap_payments.document_url` has a value (set after upload to the `documents` storage bucket at `ap_payments/<id>/<filename>`), but it's only a static `<span title="Has attachment">` — there's no click handler, no signed URL fetch, and no preview. So you can see it exists but can't open it.

There's no "Attachments" section in the **View Details** dialog either, so the only entry point right now is non-existent.

## What I'll add

### 1. Make the paperclip clickable in the table row
`src/components/accounting/APPaymentsView.tsx` (around line 328)
- Replace the static span with a `<Button variant="ghost" size="icon">` icon button.
- On click: call `supabase.storage.from('documents').createSignedUrl(payment.document_url, 60)` and `window.open(signedUrl, '_blank', 'noopener')`.
- Show a toast on failure ("Attachment file no longer exists").
- Add a tooltip: "Open attached document".

### 2. Add an explicit "Attachment" action button in the row actions
Same file, in the actions column near the existing Eye / Print buttons.
- Only render when `payment.document_url` is truthy.
- Same signed-URL + new-tab behavior as #1, with a `<Paperclip />` icon and tooltip "View attachment".
- This makes the feature discoverable for users who don't notice the small icon next to the payment number.

### 3. Show the attachment inside the **View Details** dialog
`APPaymentsView.tsx` already opens a details panel (`detailPayment` state, `FileText` button). I'll add an "Attachment" row inside that panel:
- File name (extracted from the path's last segment).
- "Open in new tab" button (signed URL).
- "Download" button (uses the same signed URL with `download` attribute).
- If the file is an image (`.png/.jpg/.jpeg/.webp`) or PDF, render an inline preview (`<img>` or `<iframe>`); otherwise just the filename + buttons.

### 4. Allow uploading an attachment for payments that don't have one yet
`APPaymentEditDialog` currently doesn't expose the upload field. Add a small "Attach document" `<input type="file">` block:
- Reuses the same upload code already in `APPaymentForm.tsx` (lines 414–423): `documents` bucket → `ap_payments/<id>/<filename>` → update `document_url`.
- After upload: invalidate the `ap_payments` query so the paperclip + preview appear immediately.

### 5. Replace any remaining lookups by hidden field
The `JournalEntryDetailDialog` already passes `documentUrl` into its `RelatedDocument` model (line 108). I'll verify that downstream `previewDoc` rendering also uses a signed URL — if it currently uses a raw path, switch it to `createSignedUrl` the same way as #1 so opening from the JE dialog also works.

## Files touched

| File | Change |
|---|---|
| `src/components/accounting/APPaymentsView.tsx` | Clickable paperclip → signed URL + new tab; new "View attachment" action button; attachment block in details dialog |
| `src/components/accounting/APPaymentEditDialog.tsx` | Add "Attach document" file input + reuse upload-to-storage code; invalidate query on success |
| `src/components/accounting/JournalEntryDetailDialog.tsx` | Convert `documentUrl` (storage path) → signed URL before rendering preview/open buttons |

## What you'll see after the fix

1. The 📎 next to a payment number is now a button — clicking it opens the attached document in a new browser tab.
2. The actions column for every payment with an attachment gets a new 📎 button with the same behavior, so it's easy to find.
3. Opening **View Details** on a payment now shows the attachment filename, an inline preview (image/PDF), and **Open** + **Download** buttons.
4. From the **Edit Payment** dialog you can attach a document to any existing payment that doesn't have one yet.
5. From the linked Journal Entry's "Related Documents" section, the AP Payment row's attachment also opens correctly (was already wired but not signed-URL-safe).

