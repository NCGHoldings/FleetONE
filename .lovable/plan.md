

# Fix: Bus Documents Visible in Development but Not on Published Site

## Root Cause

The `public/bus_details/` folder contains **342 MB** of PDFs and images across 190+ bus folders. In development mode, Vite serves the `public/` directory directly, so everything works. However, when the app is **published/deployed**, this volume of static assets either:

1. Exceeds the deployment size limit (Lovable's build output is typically capped)
2. Gets excluded or partially uploaded during the build process
3. Causes build timeouts due to the sheer volume of files being copied

This is why documents render fine inside Lovable's preview but fail on the published site (ncg-fleetone.lovable.app).

## Solution: Move Documents to Supabase Storage

Instead of bundling 342 MB of files in the repo, store them in a **Supabase Storage bucket** where they are served via CDN and accessible from any deployment.

### Step 1: Create a Supabase Storage bucket
- Create a public bucket called `bus-documents`
- Set up a folder structure: `bus-documents/{bus_no}/{filename}`

### Step 2: Upload script
- Write a one-time migration script that reads all files from `public/bus_details/` and uploads them to the Supabase bucket
- Preserve the folder structure (bus number → files)

### Step 3: Update `BusDocumentPreviewModal.tsx`
- Change `getPublicUrl()` from returning `/bus_details/{busNo}/{fileName}` to returning the Supabase Storage public URL
- Pattern: `https://{project}.supabase.co/storage/v1/object/public/bus-documents/{busNo}/{fileName}`

### Step 4: Remove `public/bus_details/`
- After confirming uploads work, remove the 342 MB folder from the repo to keep builds fast

## Alternative (Quick Fix)

If you prefer not to migrate to Supabase Storage right now, the documents can be served via the **Antigravity external links** that are already configured in `bus_folder_links.json`. The modal already has the "View on Antigravity" button — we could make that the primary viewing method instead of trying to serve files locally.

## Recommendation

Supabase Storage is the proper long-term fix. 342 MB of binary files should not live in a Git repository — it slows down clones, builds, and deployments. The Antigravity links can remain as a secondary "View Original" option.

## Files to Change
- `src/components/fleet/BusDocumentPreviewModal.tsx` — update `getPublicUrl()` to use Supabase Storage URLs
- New migration script to upload existing files
- Remove `public/bus_details/` after migration

