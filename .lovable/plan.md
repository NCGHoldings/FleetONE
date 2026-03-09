

# Add "Garage One" External System Button

## What
Add a third external system button — **Garage One** (`https://garageone.ncg.lk`) — to the sidebar, styled consistently with "Stores One" and "Document ERP". It will open in the same full-screen iframe overlay (not a new browser tab).

## Change — `src/components/layout/AppSidebar.tsx`

Add a new `SidebarMenuItem` after the Document ERP button:
- Label: **Garage One**
- URL: `https://garageone.ncg.lk`
- Icon: `Wrench` from lucide-react (fits a garage/workshop context)
- Gradient: orange/amber (`from-orange-600 to-orange-500`) to differentiate from the green (Stores) and blue (Document ERP) buttons
- Same `openExternalSystem()` call so it opens in the iframe overlay, not a new window

No other files need changes — the `ExternalSystemOverlay` and `ExternalSystemContext` already handle arbitrary external systems.

