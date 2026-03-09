

# Fix Dark Theme Table Styling

## Problem
The `TableBody` component in `src/components/ui/table.tsx` uses hardcoded light-only colors for alternating row stripes: `bg-sky-50` (odd) and `bg-slate-50` (even). These don't adapt in dark mode, causing washed-out, unreadable rows.

## Fix

### `src/components/ui/table.tsx` — Line 33
Replace hardcoded stripe colors with dark-mode-aware variants:
```
[&_tr:nth-child(odd)]:bg-sky-50 [&_tr:nth-child(even)]:bg-slate-50
```
→
```
[&_tr:nth-child(odd)]:bg-sky-50 dark:[&_tr:nth-child(odd)]:bg-white/[0.03]
[&_tr:nth-child(even)]:bg-slate-50 dark:[&_tr:nth-child(even)]:bg-white/[0.06]
```

This gives subtle alternating stripes in dark mode using transparent white overlays that work with any dark background.

### `src/components/ui/data-table.tsx` — Table header row (line 227)
The header `bg-muted/50` already uses theme tokens and should work. No changes needed there.

Single file change, 1 line modified.

