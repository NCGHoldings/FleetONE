

# Login Issue: "Invalid Credentials" — Diagnosis & Fix

## Root Cause

The auth logs confirm Supabase is returning **400: Invalid login credentials** — this is a server-side password mismatch, not a code bug. The login code in `Auth.tsx` is correct.

However, there are two improvements that will help:

### 1. Add `.trim()` to email input
Whitespace before/after the email (common on mobile or copy-paste) causes Supabase to treat it as a different email. The current code sends the raw value without trimming.

### 2. Add Password Reset ("Forgot Password") flow
The user `ruwan90044@gmail.com` last signed in on March 3rd and is now getting invalid credentials. Without a password reset option, they're stuck. The system currently has **no way to reset a password**.

## Changes

### File: `src/pages/Auth.tsx`
1. **Trim email** before sending to Supabase: `email: email.trim()`
2. **Add "Forgot Password?" link** below the password field
3. **Add forgot password handler** that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

### New File: `src/pages/ResetPassword.tsx`
- A page at `/reset-password` that detects the recovery token from URL hash
- Shows a form to set a new password
- Calls `supabase.auth.updateUser({ password })` to update it
- Redirects to `/auth` on success

### File: `src/App.tsx` (or routes file)
- Add route: `<Route path="/reset-password" element={<ResetPassword />} />`

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Trim email, add Forgot Password link + handler |
| `src/pages/ResetPassword.tsx` | **New** — password reset form page |
| Routes file | Add `/reset-password` route |

