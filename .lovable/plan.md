

# Fix AP Invoice Logo and Header Display

## Problem
The AP Invoice preview shows no logo and the company name looks unprofessional because:

1. **Logo broken**: The AP invoice case in `document-template-utils.ts` (line 366-370) overwrites `{{company_logo}}` with a **raw URL** instead of an `<img>` tag. The template expects `<div class="logo-container">{{company_logo}}</div>` — so a raw URL renders as text, not an image.

2. **Same issue exists for other document types** (AR Invoice at line 236, AR Receipt at line 264, etc.) — they all override the correctly formatted `<img>` tag with a raw URL.

## Changes

### File: `src/lib/document-template-utils.ts`

**Fix the AP Invoice logo override** (lines 366-370): Wrap the raw URL in an `<img>` tag so it renders correctly inside `logo-container`:

```typescript
// Before (broken):
placeholders['{{company_logo}}'] = invLogoUrl;

// After (fixed):
placeholders['{{company_logo}}'] = `<img src="${invLogoUrl}" style="width:100%;height:100%;object-fit:contain;" alt="Company Logo" />`;
```

**Apply the same fix to all other document type cases** that have the same raw-URL override pattern:
- AR Invoice (line ~236)
- AR Receipt (line ~264)  
- AR Credit Note (line ~286)
- AP Payment Voucher (line ~458-461)
- Debit Note (line ~486)

Each of these sets `{{company_logo}}` to a raw URL — all need wrapping in an `<img>` tag.

This ensures the logo renders properly in the `logo-container` div and the company header section looks professional with both logo and company name displayed correctly.

