# ReadyKadet brand kit

All assets are generated from code, with no paid service. Regenerate with:

```
cd ssb_web
BRAND_FONT=/path/to/big-shoulders-display-latin-900-normal.woff node scripts/build-brand.mjs
```

The font file comes from `@fontsource/big-shoulders-display` (SIL Open Font License). Letters are converted to outlines, so the SVGs render without the font installed.

## The mark

Two stacked chevrons, brass over white, on a brand-blue rounded tile. Chevrons read as rank insignia and as "moving up", which is the promise of practice. Keep clear space equal to half the tile width on every side. Do not recolour the tile, rotate the mark or add effects.

## Files

| Use | File |
| --- | --- |
| Mark (tile) | `public/brand/mark.svg` |
| Mark, one colour (light or dark surfaces) | `public/brand/mark-mono-light.svg`, `mark-mono-dark.svg` |
| Wordmark | `public/brand/wordmark-on-dark.svg`, `wordmark-on-light.svg` |
| Logo lockup (mark + wordmark) | `public/brand/logo-on-dark.svg`, `logo-on-light.svg` |
| Favicon | `public/brand/favicon.svg`, `public/favicon-16.png`, `favicon-32.png`, `src/app/favicon.ico` |
| Apple touch icon | `public/apple-touch-icon.png` (180 px) |
| App icon (store, full bleed) | `public/brand/app-icon.svg`, `app-icon-1024.png` |
| PWA icons | `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| Social avatar | `public/brand/social-avatar.svg`, `.png` (800 px, safe for circular crops) |
| Social banner | `public/brand/social-banner.svg`, `.png` (1500 x 500) |
| Email header | `public/brand/email-header.svg`, `.png` (600 x 120, exported at 2x) |
| Default share image | `public/og-default.png` (1200 x 630) |

The Flutter app (`ssb_ready_app`) still uses its old icon. Swap in `app-icon-1024.png` when the mobile app is rebranded.

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| Brand blue | `#4b7bf5` | Primary actions, links, mark tile |
| Brass | `#f5a623` | Accent, highlights, Lifetime plan, mark chevron |
| Navy | `#0f1220` | Marketing share images, email header |
| Page background | `oklch(0.145 0 0)` (dark theme) | App and site |
| Ink | `#e8eaf2` | Text on dark |
| Muted text | `oklch(0.708 0 0)` | Secondary text. Keep contrast at 4.5:1 or better on the page background. |

Primary buttons use blue with white text. Brass buttons use black text, never white.

## Type

- Display: Big Shoulders (Google Font), black weight, uppercase, for headlines and the wordmark.
- Body: Public Sans, regular and semibold.
- Sentence case for buttons, labels and UI copy. Uppercase only for display headlines.

## Voice

Plain language, direct, no hype. Say what the tool does and where it stops. Never invent statistics, results or testimonials. Never state exam dates, ages or eligibility as fact without linking the official notice. ReadyKadet is independent and is not affiliated with the Indian Armed Forces, the Services Selection Board or any recruiting body, and says so.

## Placeholders to replace

- Domain: `NEXT_PUBLIC_SITE_URL` (falls back to `http://localhost:3000`).
- Support email `support@readykadet.com` (in `src/lib/legal.ts`).
