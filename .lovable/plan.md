

# Add Alternating Row Colors (Zebra Striping) to All Tables

## Problem
All tables currently have the same white background for every row, making it hard to visually track rows across wide tables. The user wants alternating row colors like the StoresONE reference screenshot.

## Fix
A single change to `src/components/ui/table.tsx` — add `even:bg-muted/30` (or `odd:bg-muted/30`) to the `TableBody` component so every other row gets a subtle background. This automatically applies to **all tables** project-wide since every table uses this shared component.

### `src/components/ui/table.tsx` — TableBody (line 33)
Change the class to:
```
"[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-muted/30"
```

This adds a light alternating background on even rows across every table in the application — AP payments, journal entries, school payments, fleet tables, etc.

