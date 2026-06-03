# ShakerSplit — Health & Lifestyle Tracker

## TL;DR

**ShakerSplit** is a $0/month Progressive Web App for tracking food, workouts, and alcohol consumption with weekly planning, analytics, and an explore section. Built as a PWA (installable on iOS/Android without App Store fees), powered by React + TypeScript on Vercel's free tier, Node.js serverless functions, and Supabase's free PostgreSQL tier. Zero infrastructure cost.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Free Tier)                           │
│                                                                     │
│  ┌───────────────────────┐     ┌─────────────────────────────────┐ │
│  │   React 18 + Vite     │     │   Node.js + Express (Serverless)│ │
│  │   TypeScript           │────▶│   /api/* routes                 │ │
│  │   Tailwind + Shadcn   │     │   TypeScript                    │ │
│  │   PWA (Service Worker) │     │   MVC + Service + Repository   │ │
│  └───────────────────────┘     └──────────────┬──────────────────┘ │
└─────────────────────────────────────────────────┼───────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │   SUPABASE (Free Tier)   │
                                    │                         │
                                    │  • PostgreSQL database  │
                                    │  • Auth (email + OAuth) │
                                    │  • Storage (photos)     │
                                    │  • Row Level Security   │
                                    └─────────────────────────┘
```

### Request Flow

```
User (PWA) → Vercel CDN (static assets)
User (PWA) → /api/* → Serverless Function → Supabase PostgreSQL
User (PWA) → Supabase Auth (direct client-side for login/signup)
```

---

## PWA Strategy

| Concern            | Solution                                               |
| ------------------ | ------------------------------------------------------ |
| Installation       | Web App Manifest → "Add to Home Screen" on iOS/Android |
| Offline            | Service Worker caches shell + recent data              |
| Push Notifications | Web Push API (Phase 2)                                 |
| Camera Access      | MediaDevices API for food photos                       |
| Performance        | Vite build + code splitting + lazy routes              |
| Updates            | Service worker update prompt on new deploy             |
| Cost               | $0 — no App Store fees, no developer accounts          |

**Why PWA over native?**

- Zero cost (no $99/yr Apple, no $25 Google)
- Single codebase for all platforms
- Instant deploys via Vercel
- No app review process
- Sufficient native APIs (camera, notifications, offline)

---

## User Roles & Auth

| Role      | Permissions                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **ADMIN** | Full CRUD on all data, manage users, moderate content, configure global settings, view all analytics, manage recipe/routine libraries |
| **USER**  | CRUD own logs, own plans, view shared recipes/routines, view own analytics, manage own profile                                        |

### Auth Flow

```
┌──────────┐   email/password    ┌────────────────┐
│  Client  │──── or Google ─────▶│  Supabase Auth │
│  (React) │                     │  (JWT issued)  │
└────┬─────┘                     └────────────────┘
     │
     │ JWT in Authorization header
     ▼
┌──────────────────┐      verify JWT      ┌──────────────┐
│  /api/* routes   │────────────────────▶  │  Supabase    │
│  (serverless)    │                       │  (validates) │
└──────────────────┘                       └──────────────┘
```

- **Provider**: Supabase Auth (email/password + Google OAuth)
- **Token**: JWT stored in memory (access) + httpOnly cookie (refresh)
- **Role check**: `users.role` column, enforced server-side on every request
- **RLS**: Supabase Row Level Security as secondary defense layer

---

## Core Features (MVP)

### 1. Dashboard

- Today's summary cards (meals logged, workout status, drinks today)
- Active streaks with fire icons
- Weekly progress ring/bar
- Quick-add FAB (floating action button) → opens log type picker
- Greeting with time-of-day awareness

### 2. PLAN Section

- **Weekly View**: 7-day grid showing planned meals/workouts/alcohol
- **Day Detail**: Tap a day → see/edit all planned items for that day
- **Templates**: Save any week as a reusable template, load from templates library
- Plan entries are flexible JSONB (meals, exercises, or alcohol plans)

### 3. LOG Section

#### Food Log

| Field             | Type                                                  | Required |
| ----------------- | ----------------------------------------------------- | -------- |
| Meal type         | BREAKFAST / LUNCH / DINNER / SNACK / PRE_GAME         | ✓        |
| Food items        | JSONB array [{name, quantity_g, calories, protein_g}] | ✓        |
| Total calories    | number                                                | ○        |
| Total protein (g) | number                                                | ○        |
| Photo             | URL (Supabase Storage)                                | ○        |
| Notes             | text                                                  | ○        |

#### Workout Log

| Field           | Type                                                                                           | Required |
| --------------- | ---------------------------------------------------------------------------------------------- | -------- |
| Workout type    | GYM_PUSH / GYM_PULL / GYM_LEGS / GYM_UPPER / GYM_LOWER / GYM_FULL / RUN / WALK / SPORT / OTHER | ✓        |
| Exercises       | JSONB [{name, sets, reps, weight_kg}] or [{distance_km, pace}]                                 | ✓        |
| Duration (min)  | number                                                                                         | ✓        |
| Calories burned | number                                                                                         | ○        |
| Notes           | text                                                                                           | ○        |

#### Alcohol Log

| Field               | Type                                         | Required         |
| ------------------- | -------------------------------------------- | ---------------- |
| Spirit type         | text (vodka, gin, tequila, beer, wine, etc.) | ✓                |
| Quantity (ml)       | number                                       | ✓                |
| Mixer               | text (coconut water, soda, tonic, etc.)      | ○                |
| Pre-game meal eaten | boolean                                      | ✓                |
| Water consumed (ml) | number                                       | ○                |
| Intoxication level  | 1–5 scale                                    | ○ (log after)    |
| Hangover severity   | 1–5 scale                                    | ○ (log next day) |

### 4. Explore Section

- **Recipes**: Curated recipe cards with YouTube embed links, ingredients, category tags
- **Workout Routines**: Video-linked routines by muscle group / difficulty level

### 5. Analytics

- Weight over time (line chart)
- Calories/protein trends (bar chart)
- Workout frequency (heat map or bar)
- Alcohol consumption patterns (weekly bar)
- Streak history
- Powered by Recharts

### 6. Admin Panel

- User list with search/filter
- Deactivate/delete users
- Moderate recipes/routines (approve/reject)
- Global app stats (total users, logs per day)

---

## Optional Features (Phase 2+)

| Feature            | Description                                             | Phase  |
| ------------------ | ------------------------------------------------------- | ------ |
| Mental Health      | Mood (1–10), sleep hours/quality, journal entries, tags | 3      |
| Friends/Social     | Friend requests, shared plans, accountability feed      | 3      |
| Gamification       | XP, levels, badges, streak rewards                      | 3      |
| Push Notifications | Log reminders, workout alerts, hydration reminders      | 2      |
| Photo Upload       | Camera capture for food logs → Supabase Storage         | 2      |
| Weight Tracking    | Daily weight log with trend chart                       | 2      |
| AI Suggestions     | Smart recommendations based on patterns                 | Future |

---

## Pages & Navigation

### Navigation Structure

**Mobile (Bottom Tabs):**

```
┌─────────────────────────────────────────────────┐
│  🏠 Dashboard │ 📋 Plan │ ✏️ Log │ 🔍 Explore │ 👤 Profile │
└─────────────────────────────────────────────────┘
```

**Desktop (Left Sidebar):**

```
┌────────────┬──────────────────────────────┐
│ Dashboard  │                              │
│ Plan       │       Main Content           │
│ Log        │                              │
│ Explore    │                              │
│ Profile    │                              │
│ ───────    │                              │
│ Admin ⚙️   │                              │
└────────────┴──────────────────────────────┘
```

### 14 Pages

| #   | Page               | Route               | Description                                          |
| --- | ------------------ | ------------------- | ---------------------------------------------------- |
| 1   | Login / Register   | `/auth`             | Email + Google OAuth, auto-redirect if authenticated |
| 2   | Dashboard          | `/`                 | Today's snapshot, streaks, quick-add FAB             |
| 3   | Plan – Weekly      | `/plan`             | 7-day calendar grid with meal/workout/alcohol slots  |
| 4   | Plan – Day         | `/plan/:day`        | Detailed editable day plan                           |
| 5   | Plan – Templates   | `/plan/templates`   | Save/load/manage reusable weekly templates           |
| 6   | Log – Food         | `/log/food`         | Add/edit food entry with photo option                |
| 7   | Log – Workout      | `/log/workout`      | Log gym exercises or run with duration               |
| 8   | Log – Alcohol      | `/log/alcohol`      | Log drinks + damage-control checklist                |
| 9   | Explore – Recipes  | `/explore/recipes`  | Browse/search recipe library with YouTube links      |
| 10  | Explore – Workouts | `/explore/workouts` | Browse workout routines with video embeds            |
| 11  | Analytics          | `/analytics`        | Charts, trends, comparisons over time                |
| 12  | Profile / Settings | `/profile`          | Edit profile, preferences, dark/light toggle         |
| 13  | Admin Panel        | `/admin`            | User management, content moderation (ADMIN only)     |
| 14  | Mental Health      | `/log/mental`       | Mood/journal/sleep tracker (Phase 3)                 |

### Navigation Flow

```
Auth → Dashboard (home)
Dashboard → Quick-add FAB → Log Food | Log Workout | Log Alcohol
Plan tab → Weekly view → Tap day → Day detail
Log tab → Sub-tabs: Food | Workout | Alcohol
Profile → Admin Panel (admin role only)
```

---

## UI Design

### Theme

| Property          | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Mode              | Dark primary (light mode toggle available)                |
| Base colors       | Deep navy `#0F172A`, Dark slate `#1E293B`, Card `#334155` |
| Font              | Inter (Google Fonts)                                      |
| Border radius     | 8px (rounded-lg)                                          |
| Component library | Shadcn/UI                                                 |

### Category Accent Colors

| Category      | Color  | Hex       | Usage                            |
| ------------- | ------ | --------- | -------------------------------- |
| Food          | Green  | `#4CAF50` | Food cards, icons, progress bars |
| Workout       | Orange | `#FF9800` | Workout cards, gym indicators    |
| Alcohol       | Purple | `#9C27B0` | Alcohol cards, drink indicators  |
| Mental Health | Blue   | `#2196F3` | Mood/journal cards (Phase 3)     |

### Responsive Breakpoints

- Mobile: < 768px → Bottom tabs, stacked cards, full-width forms
- Tablet: 768–1024px → 2-column grid, bottom tabs
- Desktop: > 1024px → Sidebar nav, 3-column dashboard, data tables

### Key UI Patterns

- Cards with category-colored left border accent
- FAB (bottom-right) for quick-add on mobile
- Pull-to-refresh on log lists
- Skeleton loaders during data fetch
- Toast notifications for success/error
- Bottom sheets for mobile action menus
- Swipe-to-delete on log entries (mobile)

---

## Implementation Phases

### Phase 1: MVP Foundation (~3–4 weeks)

| Week | Tasks                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Project setup (monorepo, Vite, Tailwind, Shadcn/UI), Supabase project creation, DB schema migration, Auth setup (email + Google), Login/Register page |
| 2    | Backend API structure (Express + TypeScript), Dashboard page, Food Log (CRUD), Workout Log (CRUD)                                                     |
| 3    | Alcohol Log (CRUD), Basic Plan section (weekly view + day entries), Profile page                                                                      |
| 4    | PWA setup (manifest + service worker), deploy to Vercel, testing, bug fixes, polish                                                                   |

### Phase 2: Enhancements (~2–3 weeks)

| Week | Tasks                                                                            |
| ---- | -------------------------------------------------------------------------------- |
| 5    | Analytics page (Recharts), weight tracking, photo upload (Supabase Storage)      |
| 6    | Explore – Recipes (CRUD + YouTube embeds), Explore – Workouts (routines library) |
| 7    | Push notifications (Web Push API), Plan templates, advanced dashboard widgets    |

### Phase 3: Social & Advanced (~2 weeks)

| Week | Tasks                                                                                  |
| ---- | -------------------------------------------------------------------------------------- |
| 8    | Mental health logging (mood/sleep/journal), Friends system (requests, shared view)     |
| 9    | Admin panel, streaks/gamification (XP, badges), final polish, performance optimization |

---

## Tech Stack

| Layer              | Technology                              | Cost         |
| ------------------ | --------------------------------------- | ------------ |
| Frontend Framework | React 18 + TypeScript                   | $0           |
| Build Tool         | Vite 5                                  | $0           |
| Styling            | Tailwind CSS 3 + Shadcn/UI              | $0           |
| Server State       | TanStack Query (React Query) v5         | $0           |
| Client State       | Zustand                                 | $0           |
| Routing            | React Router v6                         | $0           |
| Backend Runtime    | Node.js + Express + TypeScript          | $0           |
| Backend Hosting    | Vercel Serverless Functions (free tier) | $0           |
| Database           | Supabase PostgreSQL (free tier — 500MB) | $0           |
| Auth               | Supabase Auth (email + Google OAuth)    | $0           |
| File Storage       | Supabase Storage (free tier — 1GB)      | $0           |
| Frontend Hosting   | Vercel (free tier — 100GB bandwidth)    | $0           |
| Charts             | Recharts                                | $0           |
| Forms              | React Hook Form + Zod validation        | $0           |
| PWA                | Vite PWA Plugin (vite-plugin-pwa)       | $0           |
| **TOTAL**          |                                         | **$0/month** |

---

## Design Patterns

| Pattern                           | Where       | Purpose                                                                   |
| --------------------------------- | ----------- | ------------------------------------------------------------------------- |
| **MVC**                           | Backend API | Controllers handle HTTP, Models define data, Views are the React frontend |
| **Service Layer**                 | Backend     | Business logic isolated from controllers (e.g., `FoodLogService`)         |
| **Repository Pattern**            | Backend     | Data access abstracted (e.g., `FoodLogRepository` wraps Supabase queries) |
| **Factory Pattern**               | Backend     | Create handler pipeline with middleware via `createHandler()`             |
| **Component Composition**         | Frontend    | Small, reusable UI components composed into page layouts                  |
| **Custom Hooks**                  | Frontend    | Encapsulate data fetching & state logic (e.g., `useFoodLogs()`)           |
| **Container/Presentational**      | Frontend    | Smart containers fetch data, dumb components render UI                    |
| **Observer (via TanStack Query)** | Frontend    | Cache invalidation & refetch on mutations                                 |
| **Feature Modules**               | Frontend    | Each feature is self-contained (components, hooks, services, types)       |

---

## Key Decisions

| Decision                                | Rationale                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| PWA over Capacitor/Native               | $0 distribution, no app store fees, instant updates, sufficient APIs          |
| Node.js over Spring Boot                | Runs on Vercel serverless (free), same language as frontend (TypeScript)      |
| Vercel serverless over dedicated server | Free tier, auto-scaling, zero DevOps, Git-based deploys                       |
| Supabase over Firebase                  | PostgreSQL (relational), generous free tier, built-in Auth + Storage + RLS    |
| TanStack Query over Redux               | Purpose-built for server state, caching, background refetch out of the box    |
| Zustand over Redux/Context              | Minimal boilerplate for client-only state (UI state, form drafts)             |
| Shadcn/UI over Material UI              | Smaller bundle, fully customizable, Tailwind-native, copy-paste ownership     |
| JSONB columns for flexible data         | Food items & exercises vary per entry — avoids excessive normalization        |
| Monorepo (single Vercel project)        | Simpler deploys, shared types between frontend and API                        |
| Dark mode primary                       | Target demographic prefers dark UI, reduces eye strain during evening logging |

---

## Scope Boundaries

### In Scope (MVP — Phase 1)

- ✅ User authentication (email + Google)
- ✅ Food, Workout, Alcohol logging (full CRUD)
- ✅ Weekly planning with day-level detail
- ✅ Dashboard with today's summary
- ✅ Profile page
- ✅ PWA installable on iOS/Android
- ✅ Dark mode UI
- ✅ Responsive (mobile-first + desktop)
- ✅ Deployed on Vercel + Supabase (free)

### Out of Scope (Deferred)

- ❌ Mental health tracking (Phase 3)
- ❌ Social/friends features (Phase 3)
- ❌ Gamification/XP/badges (Phase 3)
- ❌ AI-powered recommendations
- ❌ Barcode scanning for food
- ❌ Calorie/macro auto-calculation (manual only in MVP)
- ❌ Native app (App Store / Play Store)
- ❌ Multi-language / i18n
- ❌ Offline-first with sync (basic offline shell only)
- ❌ Wearable device integration

---

## Cost Breakdown

| Service                            | Free Tier Limits                             | Our Usage (estimated)                | Monthly Cost |
| ---------------------------------- | -------------------------------------------- | ------------------------------------ | ------------ |
| **Vercel** (Frontend + API)        | 100GB bandwidth, 100k serverless invocations | ~5GB, ~10k invocations               | $0           |
| **Supabase** (DB + Auth + Storage) | 500MB DB, 1GB storage, 50k auth MAUs         | ~50MB DB, ~200MB storage, 2–10 users | $0           |
| **Domain** (optional)              | Vercel provides `*.vercel.app`               | Using free subdomain                 | $0           |
| **Google OAuth**                   | Free forever                                 | Free                                 | $0           |
| **Total**                          |                                              |                                      | **$0/month** |

> **Scaling note:** Free tiers comfortably support 1–100 active users. If the app grows beyond that, Supabase Pro ($25/mo) and Vercel Pro ($20/mo) would be the first upgrades needed.
