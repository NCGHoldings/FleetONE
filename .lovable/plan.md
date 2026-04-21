

## Bug: Invite emails point to the wrong domain → "Project not found"

### Root Cause
`supabase/functions/send-staff-invite/index.ts` line 134 hardcodes:
```
https://ncg-fleetflow.lovable.app/accept-invite?token=...
```

But the **real published domain is `https://ncg-fleetone.lovable.app`** (confirmed via project URLs). The `ncg-fleetflow` domain does not exist → Lovable shows the generic "Project not found / Publish or update your Lovable project" placeholder. This is **not** a publish/build issue — it's the wrong URL in the email itself.

### Why It "Works" Sometimes
- On **your laptop** you're already signed into Lovable in another tab, so clicking the link sometimes lands on a cached/redirected valid project.
- On **another user's laptop** or **incognito**, there's no session → browser hits the dead `ncg-fleetflow.lovable.app` directly → "Project not found" placeholder.

### The Fix (1 file, 1 line)

**`supabase/functions/send-staff-invite/index.ts` line 134** — make the domain dynamic instead of hardcoded:

```ts
// Derive base URL from the request origin, fall back to the correct published domain
const origin = req.headers.get("origin") 
  || req.headers.get("referer")?.replace(/\/$/, "") 
  || "https://ncg-fleetone.lovable.app";
const baseUrl = origin.startsWith("http") ? origin : "https://ncg-fleetone.lovable.app";
const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;
```

This way:
- When sent from the published site → uses `ncg-fleetone.lovable.app` ✅
- When sent from preview → uses the preview URL ✅
- When sent from a future custom domain (e.g. `app.ncg.lk`) → uses that ✅
- Hardcoded fallback is the **correct** domain, not the dead one

### Files To Change
| File | Change |
|---|---|
| `supabase/functions/send-staff-invite/index.ts` | Replace hardcoded `ncg-fleetflow` domain with origin-derived URL + correct `ncg-fleetone` fallback |

### Scope & Safety
- Edge function only — no schema, no UI, no data migration
- Edge functions auto-deploy; **no Publish click needed** for this fix to go live
- Existing pending invites still in DB will keep their old broken URLs; user must **re-send those invites** after the fix to get working links

### What The User Will See After The Fix
- New invites sent → email contains `https://ncg-fleetone.lovable.app/accept-invite?token=...`
- Recipient opens link in any browser (including incognito, other laptops) → loads the real signup page, not "Project not found"
- Old already-sent invites need to be re-issued (the broken URLs in those old emails can't be retroactively rewritten)

