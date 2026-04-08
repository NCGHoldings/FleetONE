

# Bus Documents Not Showing on Published Site

## Root Cause: Not a Code Issue — Needs Re-publish

I investigated thoroughly and found:

1. **Supabase Storage bucket `bus-documents`** exists, is public, and contains **751 files across 205 buses** — all accessible
2. **The code is correct** — `getPublicUrl()` already builds Supabase Storage URLs (not local file paths)
3. **The manifest `bus_documents.json`** is bundled correctly with 206 buses / 767 files
4. **I verified a document URL works**: `https://wwjpdszkmtnzshbulkon.supabase.co/storage/v1/object/public/bus-documents/JC%202449/FITNESS.jpg` returns HTTP 200

The published site (`https://ncg-fleetone.lovable.app`) is running an **older deployment**. The current code in your editor already has the fix (Supabase Storage URLs), but it hasn't been published yet.

## Fix

**Click the "Publish" button** in the top-right corner of Lovable to deploy the latest code. No code changes are needed — everything is already working correctly in the preview.

After publishing, the documents will load on the live site because they're served from Supabase Storage, not from local files.

## No Code Changes Required

