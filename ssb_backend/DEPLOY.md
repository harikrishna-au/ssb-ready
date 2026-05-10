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
| `SUPABASE_URL` / `SUPABASE_KEY` | Supabase client routes (if used) |
| `JWT_SECRET` | Required by app bootstrap |
| `OPENAI_API_KEY` | AI / OCR / pipelines |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `OPENAI_VISION_MODEL` | Optional; defaults to `OPENAI_MODEL` |
| `AI_PROMPT_MAX_CHARS` | Max chars sent to OpenAI per prompt |
| `FIREBASE_PROJECT_ID` | Firebase Admin |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON (e.g. Render secret); alternative to file-based credentials |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON **or** use default credentials on GCP |

For Firebase Admin in production, prefer **`FIREBASE_SERVICE_ACCOUNT_JSON`** on hosts without a filesystem secret file, or a mounted key file with `GOOGLE_APPLICATION_CREDENTIALS`.

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
   | `SUPABASE_URL` / `SUPABASE_KEY` | Required if you use Supabase-backed routes / readiness DB check. |
   | `FIREBASE_PROJECT_ID` | Firebase project. |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | **Paste the full service account JSON as one line** (mark **Secret**). Needed for Firestore Admin on Render. |
   | `FIREBASE_STORAGE_BUCKET` | Optional; set if you use Storage URLs. |
   | `CORS_ORIGIN` | Comma-separated origins, e.g. `https://yourapp.web.app,http://localhost:8080` |

4. **Firebase credential on Render**  
   Download a service account key from Firebase Console → Project settings → Service accounts.  
   Minify JSON to a single line and add as **`FIREBASE_SERVICE_ACCOUNT_JSON`** (secret).  
   Alternatively use **Docker** on Render and mount a file; then set `GOOGLE_APPLICATION_CREDENTIALS` in the container.

5. **Docker on Render**  
   Optional: create a **Web Service** with **Docker**, context `ssb_backend`, use the existing [`Dockerfile`](./Dockerfile). Pass the same env vars; map secrets via Render’s **Secret Files** if you prefer a key file over JSON-in-env.
