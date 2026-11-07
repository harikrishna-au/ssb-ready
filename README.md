# ReadyKadet

Web app for Indian defence aspirants preparing for the Services Selection Board (SSB): timed practice for NDA, CDS, AFCAT, and CAPF, scored against the Officer Like Qualities, plus a recruitment Radar and a one-time Lifetime plan.

Login is Clerk. All user data is in Supabase. The API runs on AWS Lambda.

## Layout

```
ssb/
├── ssb_web/        # Next.js app (the product)
├── ssb_backend/    # Express API (Lambda in production, Node locally)
├── supabase/       # Migrations and the Razorpay edge function
├── PPDT_IMAGES/    # Source pictures for the psychology tests
└── docs/           # Status, brand, security notes
```

## Run it locally

Web (http://localhost:3000):

```bash
cd ssb_web
npm install
cp .env.local.example .env.local
npm run dev
```

API (http://localhost:5000):

```bash
cd ssb_backend
npm install
cp render.env.template .env
npm run dev
```

Health check: `curl http://localhost:5000/api/health`

Production deploy of the API is `ssb_backend/scripts/deploy_lambda.sh`. Details are in `ssb_backend/DEPLOY.md`.
