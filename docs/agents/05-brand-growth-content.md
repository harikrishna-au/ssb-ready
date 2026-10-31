# TASK 5 of 5: Brand, marketing site, content and SEO

Branch/worktree: `agent/5-brand`.  Port hints: web 3105, backend 5105.

## Mission
Make ReadyKadet look and read like a product aspirants trust on first sight, and build the organic-search engine that brings them in. Everything must be honest: no fake testimonials, no invented numbers, no copied text.

## Current state
Landing page `ssb_web/src/app/page.tsx` (hero with a playable WAT demo, Radar strip, tests list, how it works, OLQs, pricing, FAQ). 15 blog posts in `ssb_web/src/lib/posts/*.ts`. The logo is the old mobile icon (`ssb_web/public/logo.png`). Name ReadyKadet was chosen but the domain is not registered. Legal pages are drafts reading from `ssb_web/src/lib/legal.ts`.

## Problems to solve
1. Brand kit: a real logo (wordmark + mark, light/dark, favicon set, Apple touch icon, app icon), colour and type tokens documented in `docs/BRAND.md`, social profile assets, email header. Produce SVGs in-repo; do not use a generator that needs a paid account. Replace `public/logo.png` and every reference.
2. Open Graph and share images: a dynamic `opengraph-image` per blog post and per exam page (Next metadata image routes), Twitter cards, correct canonical URLs driven by `NEXT_PUBLIC_SITE_URL`.
3. Landing v2: tighter hero, real product screenshots generated with Playwright (script committed, so they can be refreshed) in a device frame, a short product walkthrough (screen recording or animated sequence you can generate reproducibly), a clear free-vs-Lifetime comparison, an "is this for me?" section for NDA/CDS/AFCAT, trust section that only states verifiable facts (independent tool, not affiliated, how scoring works and its limits). Mobile first. Respect reduced motion.
4. Public pricing page `/pricing` and exam landing pages (`/nda`, `/cds`, `/afcat`, `/capf`): what the exam is, eligibility pointers that link to official notices (never state dates or ages as fact without an official link), how the SSB works for that entry, a prep plan, and CTAs. Structured data (FAQPage, BreadcrumbList, Course/SoftwareApplication where appropriate).
5. Content engine: take the blog from 15 to 40+ posts. Priorities: SSB repeater tips, GTO tasks explained one by one, group discussion topics, group planning exercise, PIQ filling guide, 30-day and 90-day SSB study plans, OIR practice and tricks, current-affairs routine for the interview, SSB day-by-day checklist, "what to carry", medical standards pointers (link to official), physical fitness prep, common reasons for rejection, women entry, NCC special entry, TES, SSC tech, Agniveer vs officer entries. Add a fact-check process: every post gets a `sources` list and a `reviewedOn` date rendered at the bottom; flag any claim you cannot source. Add author/reviewer bylines only if the human supplies real people. Add Article schema, an updated-date, reading progress, related posts and an on-page table of contents (already partly there).
6. Lead capture: email newsletter signup (a weekly "Radar digest" is a good promise, coordinate with Agent 4's reminder system, use a stub until they land), a free downloadable checklist (PDF generated in-repo), and a referral link scaffold ("invite a friend") with no rewards until the human defines them.
7. Technical SEO: sitemap with `lastModified`, robots, internal linking rules, hreflang if you add Hindi, a `/blog/category/[slug]` and `/blog/tag/[slug]` structure, pagination, RSS feed (`/blog/rss.xml`), image alt-text audit, 404s with helpful links. Optional but valuable: Hindi versions of the top 10 posts (clearly marked machine-assisted until a human reviews).
8. Visual QA: Playwright screenshots at 375/768/1280 for every public page, fix overflow, overlap (we already had a card-title overlap bug), contrast and spacing problems you find. Provide a before/after list in the handoff.

## You own
`ssb_web/src/app/{page,layout}.tsx` (metadata and landing only; do not touch the providers in `layout.tsx`), `ssb_web/src/app/{blog,pricing,nda,cds,afcat,capf,privacy,terms,refunds,sitemap,robots}/**`, `ssb_web/src/lib/{posts,legal}/**`, `ssb_web/src/components/site/**`, `ssb_web/public/**`, `docs/BRAND.md`, screenshot scripts under `ssb_web/scripts/**`.

## Interfaces
- Consume Agent 4's `GET /api/radar` for the landing strip once it exists; until then keep using `RadarLanding`.
- Do not change navigation inside the signed-in app (Agent 2/4 own those pages). You may add marketing links in `components/site/header.tsx`.

## Needs from the human
Final decision on domain and support email, any real founder/mentor names for bylines, real testimonials with written permission, and who reviews the legal text. Until then write placeholders that are obviously placeholders and list them in the handoff.

## Definition of done
- New brand assets everywhere, old icon gone, favicons and OG images verified in the rendered HTML.
- 25+ new posts, each with sources and a reviewedOn date, zero invented statistics, zero copied passages.
- Lighthouse SEO >= 95 and accessibility >= 95 on landing, pricing and one post (or reasons listed).
- Screenshot set committed and the before/after fix list written.
