

# Fix Table Alternating Row Colors

## Change

**`src/components/ui/table.tsx`** — TableBody (line 33):

Replace current class with:
```
[&_tr:last-child]:border-0 [&_tr:nth-child(odd)]:bg-sky-50 [&_tr:nth-child(even)]:bg-slate-50
```

This gives light blue on odd rows and neutral light gray on even rows — no more red/warning appearance. One line, applies globally.

