

# Redesign AP Invoice Template for Professional Look

## Problem
The current AP Invoice template uses an orange accent color (`#ea580c`) throughout — for card borders, total box, summary section, and the amount-in-words highlight. This creates a harsh, unprofessional appearance with too many orange elements competing for attention.

## Solution
Redesign the AP Invoice template in `src/lib/document-template-seeder.ts` with a refined, corporate color scheme:

### Color Changes
- **Accent**: Change from orange (`#ea580c`) to a sophisticated slate-blue (`#334155`) or corporate navy (`#1e3a5f`)
- **Payment summary**: Use subtle gray background instead of orange-tinted background
- **Total box**: Use a clean dark border with professional typography instead of orange
- **Amount-in-words**: Change from yellow/amber background to a subtle light blue/gray professional highlight
- **Cards (Invoice Details, Supplier)**: Add subtle left-border accent in muted blue instead of default gray

### Specific Changes in `generateAPInvoiceTemplate()`
1. Update CSS variables: `--accent` and `--accent-2` to professional navy/dark slate tones
2. Update `--chip` to a cooler tone matching the new accent
3. Remove inline orange `style` overrides on `.payment-summary` and `.total-box`
4. Restyle the `.amount-words` section — use a cooler, more professional background (light slate instead of amber)
5. Add subtle left-border accents on `.card` elements for visual hierarchy

### File to modify
- `src/lib/document-template-seeder.ts` — only the `generateAPInvoiceTemplate()` function (lines 447-540)

No other templates are affected. The common styles remain unchanged.

