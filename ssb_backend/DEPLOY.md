# AWS Lambda (current production backend)

- **Where:** AWS account `384875140113`, region **`ap-southeast-2` (Sydney)**. Mumbai and other regions are blocked by the organization's policy.
- **What:** one Lambda function `readykadet-api` (Node 22, ARM, 512 MB, 60 s) behind a free public Function URL. Entry file: `lambda.js`. Role: `readykadet-api-role` (logging only). Logs kept 14 days.
- **URL:** `https://ajqqwsb247x3hpmugniuho37p40wbkcs.lambda-url.ap-southeast-2.on.aws` (set this as `NEXT_PUBLIC_BACKEND_URL` in Vercel, no trailing slash).
- **Update the code:** `scripts/deploy_lambda.sh`. Also push settings from `.env`: `scripts/deploy_lambda.sh --env`. Use the `aws-project` profile (`aws login --profile aws-project`).
- **Other project in the same account:** `communication-backend` stack and `communication-assessment-api` function belong to something else. Do not touch them.
- **Settings** live on the function (never in the zip). `CORS_ORIGIN` is the Vercel site only. `CRON_SECRET` protects the scheduled-job routes.
- **Cost:** pay-per-request; the monthly free allowance covers a small app. Idle costs nothing. Add a budget alert.
- **Limits:** rate limits count per running copy, not across copies. A first request after a quiet spell takes about 2 s. Sydney is far from India, so each request adds a few hundred ms.

---

# Deploying `ssb_backend`

## Environment variables

All settings are read via **`config/index.js`** (single source of truth). Set at runtime (dashboard or `.env` — never commit secrets):

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default `5000`) |
| `HOST` | Bind address (use `0.0.0.0` in containers) |
| `PUBLIC_URL` | Public HTTPS base URL of **this** API (no trailing slash). Returned in `GET /` as `publicUrl` — **do not hardcode deployment URLs in application code**. Alias: `BACKEND_PUBLIC_URL`. |
| `CORS_ORIGIN` | Comma-separated allowed origins (full origin strings, not paths). |
| `JSON_BODY_LIMIT` | Express JSON limit (default `15mb`) |
| `SUPABASE_URL` | Your Supabase project address |
| `JWT_SECRET` | Required by app bootstrap |
| `OPENAI_API_KEY` | AI / OCR / pipelines |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `OPENAI_VISION_MODEL` | Optional; defaults to `OPENAI_MODEL` |
| `AI_PROMPT_MAX_CHARS` | Max chars sent to OpenAI per prompt |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required.** The service-role key. User data lives in a private table, so the public anon key cannot be used. |
| `CLERK_SECRET_KEY` | **Required.** Verifies every login (Clerk session token). |

User data (results, history, PIQ) is stored in Supabase through the service-role key. Logins are Clerk only; there is no Firebase.

## Docker

From `ssb_backend/`:

```bash
docker build -t ssb-backend .
docker run --env-file .env -p 5000:5000 ssb-backend
```

## Mobile app

Point the Flutter app `BACKEND_URL` to your HTTPS API base (no trailing slash), e.g. `https://api.example.com`.

## Render (PaaS)

1. **Blueprint (recommended)**  
   In the Render dashboard: **New → Blueprint** → select this repo.  
   The spec lives at repo root (`render.yaml`, next to `ssb_backend/`) and sets **Root directory** to `ssb_backend`.

2. **Manual Web Service**  
   - **Root directory:** `ssb_backend`  
   - **Build command:** `npm ci`  
   - **Start command:** `npm start`  
   - **Health check path:** `/api/health`  

3. **Environment variables** (Dashboard → Service → **Environment**)

   | Variable | Notes |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `PORT` | **Do not set** — Render injects `PORT`. `server.js` already uses it. |
   | `OPENAI_API_KEY` | Required for AI / OCR / evaluation. |
   | `JWT_SECRET` | Required by app bootstrap (`config/env.js`). |
   | `SUPABASE_URL` | Required. Your Supabase project address. |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Required (secret).** Service-role key for the user-data table. |
   | `CLERK_SECRET_KEY` | **Required (secret).** Verifies logins. |
   | `CORS_ORIGIN` | Comma-separated origins, e.g. `https://yourapp.web.app,http://localhost:8080` |

4. **Keys on Render**  
   Add `SUPABASE_SERVICE_ROLE_KEY` and `CLERK_SECRET_KEY` as secrets. There is no other credential to configure.

5. **Docker on Render**  
   Optional: create a **Web Service** with **Docker**, context `ssb_backend`, use the existing [`Dockerfile`](./Dockerfile). Pass the same env vars; map secrets via Render’s **Secret Files** if you prefer a key file over JSON-in-env.

## Privacy policy URL (Play Console / stores)

After deploy, set **`PUBLIC_URL`** to your Render HTTPS base (no trailing slash), e.g. `https://ssb-ready.onrender.com`.

Use this in **Google Play Console → App content → Privacy policy**:

```text
https://YOUR-SERVICE.onrender.com/privacy
```

Example (replace with your service name):

```text
https://ssb-ready.onrender.com/privacy
```

The page is public HTML (no login). Optional env **`SUPPORT_EMAIL`** sets the contact address on that page.

Verify: open the URL in a browser, or `curl -I https://YOUR-SERVICE.onrender.com/privacy` (expect `200` and `Content-Type: text/html`).
