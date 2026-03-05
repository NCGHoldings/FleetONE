

# Fix GL Guardian "Config" Button + AP Invoice GL Linking

## Problems Found

### 1. "Config" button is disabled and does nothing
In `GLIntegrityGuardian.tsx` line 635, the Config button has `disabled` prop and no `onClick` handler. When gaps show "Needs Config", users have no way to navigate to the Core GL Settings page to configure the required accounts.

### 2. AP Invoice GL posting does NOT link `journal_entry_id` back
In `useAccountingMutations.ts` lines 1540-1568, `useApproveAPInvoice` calls `postAPInvoiceToGL` and gets back a `journalEntryId`, but never writes it back to the `ap_invoices` row. This means:
- The GL Guardian always detects AP invoices as "gaps" (it checks `journal_entry_id IS NULL`)
- Even approved+posted invoices show as "Needs Config" or unposted

### 3. "Settings config" link text is not clickable
The "⚠ X gaps need Settings config" text at line 392 is plain text, not a link to settings.

## Plan

### File 1: `src/components/accounting/GLIntegrityGuardian.tsx`

**A. Make Config button navigate to Settings → Core GL Settings**
- Remove `disabled` from the Config button (line 635)
- Add `onClick` handler using `useNavigate` to go to `/settings` with the `core-gl-settings` tab
- Make the "gaps need Settings config" text a clickable link to the same destination

### File 2: `src/hooks/useAccountingMutations.ts`

**A. Fix `useApproveAPInvoice` — link journal_entry_id back to ap_invoices**
After the `postAPInvoiceToGL` call succeeds (line 1551), add:
```typescript
if (glResult.success && glResult.journalEntryId) {
  await supabase.from("ap_invoices")
    .update({ journal_entry_id: glResult.journalEntryId })
    .eq("id", id);
}
```
This ensures the GL Guardian sees the invoice as posted and stops flagging it.

## Summary

| File | Change |
|---|---|
| `GLIntegrityGuardian.tsx` | Enable Config button → navigates to Settings Core GL tab; make "needs config" text clickable |
| `useAccountingMutations.ts` | Link `journal_entry_id` back to `ap_invoices` after GL posting on approval |

These two fixes will: (1) let users actually configure GL accounts when gaps say "Needs Config", and (2) stop AP invoices from being perpetually flagged as unposted gaps after approval.

