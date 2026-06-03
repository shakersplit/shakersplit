# ShakerSplit

A free, open, fully-featured PWA that tracks **food, workouts, alcohol, weight, and mental health** in one place — built for people who train hard at the gym AND go out hard at the party.

**Live:** [shakersplit.divyanshjha.in](https://shakersplit.divyanshjha.in) · **Source:** [github.com/shakersplit/shakersplit](https://github.com/shakersplit/shakersplit)

[![Made with React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Powered by Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Hosted on Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Cost](https://img.shields.io/badge/cost-%240%2Fmo-success)](https://github.com/shakersplit/shakersplit)

## What it does

ShakerSplit is the everyday tracker most fitness apps don't quite cover — most aim at either gym people OR diet people, and none of them treat alcohol seriously. This one does all three at once, plus mental health and weight, plus a social layer for friends.

Core features:

- **Food log** — meals with multi-item entries, calories, protein, photos, and **AI-assisted natural-language entry** ("two eggs and toast" → structured macros)
- **Workout log** — gym splits, runs, walks, sports, with sets/reps/weight or distance + saveable templates
- **Alcohol log** — drinks with harm-reduction fields (pre-game meal, water, intoxication score, hangover severity)
- **Weight log** — daily weight + body fat with delta from previous entry
- **Mental health log** — mood (1-10), sleep hours + quality, journal, freeform tags
- **Weekly plan** — 7-day grid with color-coded entries across food/workout/alcohol categories
- **Goals** — 7 goal types with weekly/monthly progress bars driven by live data
- **Activity feed** — see friends' shared logs (per-entry opt-in privacy)
- **Friends** — send/accept/decline friend requests with push notifications
- **Analytics** — Recharts trends for calories / workout minutes / alcohol drinks / weight, 7/30/90-day windows
- **Recipe + workout routine library** — curated by admins, browsable by everyone
- **Streaks** — auto-maintained for food logging, workouts, alcohol-free days, overall
- **Web Push notifications** — works on iOS 16.4+ (when installed as PWA) and Android
- **Photo uploads** — in-browser resize, stored in Supabase Storage with per-user RLS
- **Data export** — one-click JSON dump of everything you've logged
- **Admin panel** — user management, recipe/routine CRUD, broadcast notifications, system stats
- **Dark/light theme** with persisted preference
- **PWA** — installable on iOS + Android home screens, works offline (cached shell), with auto-update toast

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 · Vite 8 · TypeScript · Tailwind v4 · TanStack Query v5 · Zustand · React Hook Form + Zod · Recharts · React Router v7 |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database | Supabase Postgres + Row Level Security |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (photos bucket, public read, owner-write RLS) |
| Email | Resend SMTP via Supabase Auth |
| Push | Web Push (VAPID) via [web-push](https://github.com/web-push-libs/web-push) |
| AI | Google Gemini Flash (free tier) for natural-language food parsing |
| Hosting | Vercel (Hobby plan — 12 serverless functions cap forces consolidation patterns) |
| Analytics | Vercel Web Analytics |
| Cost | **$0 / month** at 80-user scale |

## Repository layout

```
.
├── api/                    Vercel serverless functions (12 files, see docs/API.md)
│   ├── _lib/               shared middleware, repos, validators, utilities
│   ├── plans/[id]/...      nested CRUD for weekly plans
│   └── *.ts                top-level routes (food-logs, workout-logs, ...)
├── src/
│   ├── app/                router, providers, auth + admin guards
│   ├── components/         brand mark, layout, photo uploader, PWA toast
│   ├── features/           feature modules (food-log/, workout-log/, ...)
│   ├── hooks/              useAuth, useRole, usePushNotifications, ...
│   ├── lib/                api-client, supabase client, query-client
│   ├── pages/              one file per route
│   ├── stores/             zustand stores (auth, theme, ui)
│   ├── styles/             globals.css with theme tokens
│   ├── sw.ts               custom service worker (Workbox + push)
│   └── types/              shared TS types + enums
├── supabase/
│   ├── migrations/         001 → 008, all idempotent
│   ├── templates/          custom HTML for confirmation + recovery emails
│   └── config.toml         declarative auth config (push via supabase CLI)
├── public/
│   ├── icons/              brand mark SVG + PWA icon set
│   ├── favicon.ico
│   └── ...
├── scripts/
│   └── generate-icons.mjs  regenerates favicons/PWA icons from logo.svg
├── docs/
│   ├── ARCHITECTURE.md     system overview, data flow, security model
│   ├── API.md              every endpoint with examples
│   ├── DATABASE.md         schema, RLS strategy, migrations
│   ├── DEPLOYMENT.md       Vercel + Supabase setup, env vars, gotchas
│   └── CONTRIBUTING.md     local dev, conventions, testing
└── README.md               this file
```

## Quick start (local dev)

```bash
# 1. Clone + install
git clone https://github.com/shakersplit/shakersplit.git
cd shakersplit
npm install

# 2. Copy .env.local.example → .env.local and fill in:
#    - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY    (from Supabase dashboard)
#    - SUPABASE_SERVICE_ROLE_KEY                      (server-side only)
#    - RESEND_API_KEY                                 (optional, for SMTP)
#    - GOOGLE_CLIENT_ID + SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET  (for Google OAuth)
#    - VITE_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT (for push)
#    - GEMINI_API_KEY                                 (optional, for AI food parser)

# 3. Apply migrations to your Supabase project
supabase link --project-ref <your-project-ref>
supabase config push   # syncs auth + email templates
# then run each SQL file in supabase/migrations/ via the dashboard SQL editor
# OR via curl POST to https://api.supabase.com/v1/projects/<ref>/database/query

# 4. Run dev server (frontend)
npm run dev   # → http://localhost:5173

# 5. Run API locally (in a second terminal)
vercel dev    # → http://localhost:3000/api/*
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full setup including Resend, Google OAuth, VAPID, and Vercel deploy.

## Production deploy

This repo is set up for [shakersplit/shakersplit](https://github.com/shakersplit/shakersplit) → Vercel auto-deploy on every push to `master`. Required Vercel environment variables are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#environment-variables).

## Why $0/month

| What | Service | Free tier limit | Our usage at 80 users |
|---|---|---|---|
| Hosting + serverless | Vercel Hobby | 100 GB bandwidth/mo, 100k fn invocations/day, **12 serverless fn cap** | well under |
| Database + auth + storage | Supabase Free | 500MB DB, 1GB storage, 50k MAU, 5GB bandwidth/mo | well under |
| Transactional email | Resend | 100/day, 3000/mo | ~50/mo |
| AI food parsing | Google Gemini Flash | 15 RPM, 1M tokens/day | well under |
| Domain | divyanshjha.in (already owned) | $10/yr if you don't have one | n/a |
| Push notifications | Web Push standard | unlimited | unlimited |
| Analytics | Vercel Web Analytics | 25k events/mo | well under |

The 12-function cap is the only tight constraint. We hit it exactly. See [docs/API.md](docs/API.md) for the consolidation patterns we use to stay there.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system overview, data flow diagrams, security model
- [API reference](docs/API.md) — every endpoint, request/response shape, query-param dispatch convention
- [Database](docs/DATABASE.md) — schema, RLS policies, streak triggers, friend visibility view
- [Deployment](docs/DEPLOYMENT.md) — Vercel + Supabase + Resend + Google OAuth + VAPID setup steps
- [Contributing](docs/CONTRIBUTING.md) — local dev, code conventions, testing

## Mobile install

**iPhone:** Open `shakersplit.divyanshjha.in` in Safari → Share → Add to Home Screen. Open from the home-screen icon (push notifications only work this way on iOS).
**Android:** Open in Chrome → tap the install banner OR menu → Install app.

## License

This project is open source. See [LICENSE](LICENSE) (MIT).

## Author

Built by [Divyansh Jha](https://github.com/divyanshjha30) as a personal portfolio project. Not a company, not a startup — just an app for friends who want to track their gym + meals + nights out without paying $10/month for a fitness app.
