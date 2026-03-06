

# Embed External Systems Inside NCG with Close Button

## Problem
The user doesn't want external systems opening in new tabs. They want the systems to open **inside** the NCG app (like the POS Terminal screenshot shows), with a close/back bar at the top to quickly return to NCG.

## Solution

### Approach: Iframe Overlay
When the user clicks "Stores One" or "Document ERP" in the sidebar, instead of navigating away or opening a new tab, show a **full-screen iframe overlay** within the NCG app that loads the external system. A top bar with the system name and a close (X) button lets the user instantly return to NCG.

### 1. Create `ExternalSystemOverlay.tsx`
A new component that renders:
- A fixed full-screen overlay (z-50, covers the main content area)
- A top bar (similar to POS Terminal bar) with system name + close button
- An iframe loading the external URL at 100% width/height

### 2. Add State to `AppLayout.tsx`
- Add state: `externalSystem: { name: string, url: string } | null`
- Pass setter down via context or props
- When `externalSystem` is set, render `ExternalSystemOverlay` over the main content
- When closed, set back to `null`

### 3. Update Sidebar Buttons in `AppSidebar.tsx`
- Change the `<a>` tags to `<button>` elements that call the context setter instead of navigating
- Remove `target="_blank"` and `href` — these become in-app actions
- Remove `ExternalLink` icon since they now open inside the app

### Files to Change

| File | Change |
|---|---|
| `src/components/layout/ExternalSystemOverlay.tsx` | New — iframe overlay with close bar |
| `src/components/layout/AppLayout.tsx` | Add external system state + context provider + render overlay |
| `src/components/layout/AppSidebar.tsx` | Change links to buttons that trigger overlay |

### Note on iframes
If the external sites block embedding via `X-Frame-Options` or CSP headers, the iframe approach won't work and we'd need to fall back to `target="_self"` navigation. But since these are the user's own Lovable projects and custom domains, they should be embeddable.

