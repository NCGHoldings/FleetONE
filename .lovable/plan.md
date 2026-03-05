

# Add External System Quick-Access Buttons to Sidebar

## What the User Wants

Like the "Stores One" screenshot showing an "Open POS" button at the top of the sidebar, the user wants two quick-access buttons in their NCG Speed sidebar:

1. **Document ERP** button — links to `https://docs.lgh.lk` (Document ERP system)
2. **Stores One** button — links to the POS/Stores system (external URL)

These should:
- Open in the **same browser tab** (not a new window/popup)
- Match the current sidebar styling exactly
- Be placed prominently near the top (after logo, before Home)
- Show icons when collapsed, full text when expanded

## Plan

### Edit `src/components/layout/AppSidebar.tsx`

Add an "External Systems" section between the logo header and the Home link:

- **Two styled buttons** using `<a href="..." >` tags (not NavLink since they're external URLs):
  - **Stores One** — with `ShoppingCart` or `Store` icon, links to the Stores/POS system URL, styled as a prominent gradient button (similar to the green "Open POS" button in the reference screenshot)
  - **Document ERP** — with `FileText` or `BookOpen` icon, links to `https://docs.lgh.lk`, same button style

- Both buttons use `target="_self"` to navigate in the same tab (not popup)
- Styled to match sidebar width, with gradient backgrounds matching the existing design system
- When sidebar is collapsed, show only the icon
- Wrapped in a `SidebarGroup` for consistency

### Placement Order (top to bottom):
1. Logo header (existing)
2. **Stores One** button (new) 
3. **Document ERP** button (new)
4. Home link (existing)
5. All other groups (unchanged)

### No Other Files Changed
This is a sidebar-only UI change. No routing, no new pages — just external links styled as sidebar buttons.

