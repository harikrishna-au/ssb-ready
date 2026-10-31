# TASK 1 of 5: Payments, identity and entitlements

Branch/worktree: `agent/1-payments`.  Port hints: web 3101, backend 5101.

## Mission
Make the Rs 299 Lifetime plan purchasable on the web, safely, and make "is this user premium?" a single, trustworthy server-side fact used everywhere. Today the Razorpay flow only works for the Flutter app and Firebase logins, and the web app (Clerk logins) cannot pay.

## Problems to solve
1. `supabase/functions/lifetime-premium` verifies a Firebase token. Web users have Clerk tokens, so it rejects them. Make it accept Clerk session JWTs (verify against Clerk's JWKS, check issuer/expiry) alongside Firebase.
2. Identity mismatch: `premium_members.user_id` and `profiles.user_id` hold Firebase uids; web users have Clerk ids. Design and implement an identity-linking strategy (e.g. a `user_identities` table mapping clerk_id <-> firebase_uid, plus an email-verified link flow) so a person who bought on mobile is premium on web and vice versa. Document the trade-offs.
3. Web checkout: Razorpay Checkout JS on `ssb_web/src/app/(app)/premium`. Flow: PIQ complete (already gated in the UI) -> create order -> pay -> verify signature server-side -> entitlement active -> instant UI update. Handle failure, cancel, retry, double-click and webhook-after-redirect races (idempotent on payment id).
4. Server-side enforcement: `create_order` must refuse when the user's PIQ is incomplete (read PIQ from Firestore through the backend; completeness rules are in `ssb_web/src/lib/piq.ts`, mirror them in the backend, do not trust the client).
5. A Razorpay webhook endpoint (signature-verified) as the source of truth for payment status, plus refunds/failed payments handling.
6. Entitlements API: `GET /api/me` -> `{ userId, premium: boolean, plan, premiumSince, piqComplete }`. Replace the ad-hoc premium check in `ssb_backend/services/storyImages.js` (`isPremium`) with the shared one. Add a web hook `usePremium()` (zustand slice) and use it in the sidebar Lifetime card (hide it for premium users), the TAT/PPDT pictures messaging and the Lifetime page (show "You have Lifetime access" with receipt details).
7. Receipts and invoices: store amount, GST fields if applicable, send an email receipt (use Resend or similar, behind an env flag), and show payment history on a `/billing` page.
8. Fraud/abuse basics: rate limit order creation per user, amount fixed server-side (never trust client amount), log all state transitions.

## You own
`supabase/functions/lifetime-premium/**`, new migrations under `supabase/migrations/*payments*|*identity*`, `ssb_backend/routes/{payments,me}*.js`, `ssb_backend/services/{premium,payments,identity}*.js`, `ssb_web/src/app/(app)/premium/**`, `ssb_web/src/app/(app)/billing/**`, `ssb_web/src/components/billing/**`, `ssb_web/src/lib/use-premium.ts`.

## Interfaces you provide (others depend on these, keep them stable)
- `GET /api/me` as above (Agent 2 and 4 use `premium`).
- `services/premium.js` exports `isPremium(userId)`.

## Needs from the human
Razorpay test key id/secret + webhook secret, working Supabase project, Clerk JWKS URL / issuer. Until provided, develop against Razorpay test mode fixtures and mock the network.

## Definition of done
- Test-mode purchase works end to end for a Clerk user (document exactly how you ran it, or if you could not, say why).
- Unit tests (mocked Razorpay/Supabase) cover: signature verification, idempotency, PIQ-incomplete refusal, expired/invalid JWT, identity linking, webhook replay.
- No client-supplied amount or premium flag is trusted anywhere.
- Mobile app flows are unchanged (Firebase tokens still work).
