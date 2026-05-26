# OIR PDF → App Import

Stores **images in Supabase Storage** and question rows in Firebase **`oir_questions`** (Firestore).

## Supabase bucket (one-time)

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: **`oir-questions`** (or any name — set `SUPABASE_STORAGE_BUCKET` to match).
3. Turn on **Public bucket** if you want `getPublicUrl` links to load in the Flutter app without signed URLs.

## Backend env (`ssb_backend/.env`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_KEY` | Prefer **service_role** for this script |
| `SUPABASE_STORAGE_BUCKET` | Optional; default `oir-questions` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `--credentials ...` | Firestore writes only |

## 1) Extract PDF pages → PNG

```bash
cd ssb_backend
npm run oir:extract-pdf -- \
  --pdf "/path/to/OIR-1.pdf" \
  --out "./tmp/oir1_images" \
  --prefix "oir1_q" \
  --dpi 220
```

## 2) (Optional) Answer key JSON

`./tmp/oir1_answers.json`:

```json
{
  "1": { "correctAnswerIndex": 2 },
  "2": { "correctAnswerIndex": 0 }
}
```

## 3) Upload + seed Firestore

```bash
cd ssb_backend
npm run oir:import-images -- \
  --images "./tmp/oir1_images" \
  --set "oir1" \
  --folder "oir/questions/oir1" \
  --bucket "oir-questions" \
  --defaultText "Refer to the image and choose the correct option." \
  --answers "./tmp/oir1_answers.json" \
  --credentials "/path/to/firebase-adminsdk-....json"
```

Firebase Admin is **not** used for file storage anymore—only for Firestore `oir_questions`.
