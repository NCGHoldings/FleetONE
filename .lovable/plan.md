

# Collapse the Public Complaint Form / QR Code Section

## What Changes

Wrap the `ComplaintQRGenerator` card in a `Collapsible` component so it starts **collapsed** by default. A toggle button (chevron icon) in the card header lets users expand/collapse the QR code and URL section.

## Plan

### Modify `src/components/complaints/ComplaintQRGenerator.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Add `open` state, default to `false`
- Move the `CardHeader` outside collapsible content (always visible) with a chevron toggle button
- Wrap `CardContent` in `CollapsibleContent` so it hides when collapsed

### No other files need changes

