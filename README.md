# SSBReady — AI-Powered SSB Interview Preparation

> A full-stack mobile application that helps Indian defense aspirants prepare for the **Services Selection Board (SSB)** — the interview and selection process for becoming an officer in the Army, Navy, or Air Force.

![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-3.x-0175C2?logo=dart&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?logo=openai&logoColor=white)

---

## Overview

SSBReady covers every psychometric and interview test in the SSB process — PPDT, TAT, WAT, SRT, SDT, OIR, and the Personal Interview — with an AI evaluator that scores responses, identifies Officer Like Qualities (OLQs), and gives structured feedback instantly.

The app targets aspirants preparing for **NDA, CDS, AFCAT, CAPF, and TA** examinations.

---

## Screenshots

> _Coming soon — app is in active development._

---

## Features

### SSB Test Modules
| Module | Full Name | What it does |
|---|---|---|
| **PPDT** | Picture Perception & Discussion Test | Tap-timed story writing from an image; AI evaluates theme, action, and OLQs |
| **TAT** | Thematic Apperception Test | 12-picture story writing with AI scoring |
| **WAT** | Word Association Test | Timed word-association drill; AI assesses pattern of thought |
| **SRT** | Situation Reaction Test | Scenario-response practice with AI OLQ analysis |
| **SDT** | Self Description Test | Guided self-description with feedback |
| **OIR** | Officer Intelligence Rating | Aptitude test battery |
| **Mock Interview** | Personal Interview | PIQ-based AI mock interview with speech-to-text input and TTS playback |

### App-wide
- **Onboarding flow** — exam type and goal selection (NDA / CDS / AFCAT / TA / CAPF)
- **Dashboard** — animated progress overview, quick-access feature cards
- **Test history** — past attempts with AI feedback persisted to Supabase
- **Current affairs** — GK module for interview prep
- **Leaderboard** — score rankings per test type
- **Premium** — lifetime access at ₹299 (one-time), payments via Razorpay

---

## Architecture

The Flutter app follows **Clean Architecture** with strict layer separation:

```
lib/
├── core/               # Theme, constants, errors, shared services
├── domain/             # Entities, repository interfaces (pure Dart)
├── data/               # Repository implementations, remote datasources, models
└── presentation/
    ├── bloc/           # Feature BLoCs (auth, interview, OIR, PPDT, TAT, WAT, SRT, SDT)
    ├── screens/        # One folder per feature
    └── widgets/        # Shared UI components
```

**State management:** flutter_bloc 9.x — every feature has its own BLoC with typed Events and States, making all UI logic testable and predictable.

**Repository pattern:** Domain repositories are pure interfaces; data-layer implementations swap between Supabase, Firestore, and the REST backend without touching UI code.

---

## Tech Stack

### Flutter App
| Concern | Package |
|---|---|
| State management | `flutter_bloc` + `equatable` |
| Auth | `firebase_auth`, `google_sign_in` |
| Backend DB | `supabase_flutter` |
| HTTP | `http` |
| Payments | `razorpay_flutter` |
| Speech-to-text | `speech_to_text` |
| Text-to-speech | `flutter_tts` |
| AI (direct) | `google_generative_ai` |
| Markdown rendering | `flutter_markdown` |
| Fonts | `google_fonts` |

### Backend (Node.js on Render)
| Concern | Tech |
|---|---|
| Framework | Express 4.x |
| AI evaluation | OpenAI GPT (JSON mode) |
| Auth verification | Firebase Admin SDK |
| Database | Supabase (PostgreSQL via `@supabase/supabase-js`) |
| Deployment | Render (Singapore region, Docker-free) |
| Edge functions | Supabase Deno (payment verification) |

### Infrastructure
- **Firebase Auth** — Google Sign-In + email auth, JWT verified on every backend request
- **Supabase** — Postgres for test history, sessions, user profiles, rate limiting
- **Firestore** — leaderboard collections, WAT/SRT results
- **Razorpay** — Indian payment gateway; order creation and payment verification on Supabase Edge Function
- **Render** — always-on backend with health check at `/api/health`

---

## AI Evaluation Pipeline

Every test submission goes through a structured AI evaluation flow:

```
User submits response
       │
       ▼
REST API (Express) — auth middleware verifies Firebase JWT
       │
       ▼
aiService.js — OpenAI GPT with SSB evaluator system prompt
       │
       ▼
Returns typed JSON: { score, identified_olqs, theme, feedback }
       │
       ▼
evaluationOrchestrator.js — persists to Firestore / Supabase
       │
       ▼
Flutter renders Markdown feedback + OLQ chips + score
```

The AI prompt system instructs GPT to act as an SSB assessor and return strict JSON matching the app's model schema — no free-text parsing needed.

---

## Project Structure

```
ssb/
├── ssb_ready_app/          # Flutter application (Android + iOS)
│   ├── android/
│   ├── lib/
│   └── pubspec.yaml
├── ssb_backend/            # Node.js REST API
│   ├── routes/             # assessments, auth, evaluation, PPDT, TAT, PIQ, legal
│   ├── services/           # aiService.js, evaluationOrchestrator.js
│   ├── middleware/         # requestContext (request IDs), errorHandler
│   ├── config/             # Firebase Admin, env config
│   └── Dockerfile
├── supabase/
│   └── functions/          # Deno edge functions (lifetime-premium)
├── firebase/               # Firestore rules and config
└── render.yaml             # Infrastructure-as-code for Render deploy
```

---

## Local Setup

### Prerequisites
- Flutter SDK 3.x (`flutter --version`)
- Node.js 18+
- A Firebase project with Auth enabled
- A Supabase project
- OpenAI API key

### Flutter app

```bash
cd ssb_ready_app
flutter pub get
cp .env.example .env   # fill in Firebase config and BACKEND_URL
flutter run
```

### Backend

```bash
cd ssb_backend
npm install
cp render.env.template .env   # fill in all keys
npm run dev
```

Backend health check:
```bash
curl http://localhost:3000/api/health
```

### Environment variables (backend)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | GPT evaluation |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access |
| `FIREBASE_PROJECT_ID` | JWT verification |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment processing |
| `PUBLIC_URL` | Used in privacy policy and API root response |

---

## Deployment

The backend ships with `render.yaml` — connect the repo to [Render](https://render.com), set the secret env vars in the dashboard, and deploy. No Docker configuration needed.

```yaml
region: singapore   # close to the Indian user base
healthCheckPath: /api/health
```

The Flutter app targets Android (Play Store) as the primary platform. `build.gradle` is configured for release signing.

---

## Key Engineering Decisions

**Why BLoC over Riverpod/Provider?**  
BLoC enforces a clear event → state contract, making complex async flows (submit → evaluate → persist → render feedback) predictable and easy to test. Each feature is fully isolated.

**Why a separate Node.js backend instead of direct API calls?**  
Keeps the OpenAI API key off the client, enables server-side rate limiting and session management, and allows Supabase-side result persistence that Firestore rules can't enforce alone.

**Why Supabase + Firestore together?**  
Supabase handles relational data (user sessions, rate limits, test history) with row-level security. Firestore handles leaderboard queries where real-time ordering is simpler. Migrating Firestore data to Supabase is in progress.

---

## License

Private — all rights reserved.
