# Architecture

## Overview

```
                        ┌────────────────────────────┐
                        │  shakersplit.divyanshjha.in │
                        │   (Vercel Edge — CDN)       │
                        └──────────┬──────────────────┘
                                   │ HTTPS
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
        ▼                                                     ▼
┌──────────────────┐                            ┌─────────────────────────┐
│  Static SPA      │                            │ /api/* serverless       │
│  React / Vite    │   <─── /api fetch ────>    │ functions (12 total,    │
│  Service Worker  │                            │  Hobby plan cap)        │
│  Workbox cache   │                            └────────┬────────────────┘
└──────┬───────────┘                                     │
       │                                                 │
       │ Supabase JS SDK ─────────────────┐              │
       │  (RLS-scoped reads/writes,       │              │
       │   uses user JWT)                  │              │
       │                                  ▼              ▼
       │                           ┌────────────────────────────┐
       │                           │   Supabase                  │
       └──────────── Auth JWT ──── │   ├─ Postgres + RLS         │
                                   │   ├─ Auth (email + Google)  │
                                   │   └─ Storage (photos)       │
                                   └────────────┬────────────────┘
                                                │
                                                ▼
                                        ┌────────────────┐
                                        │  Resend SMTP   │  (signup, recovery)
                                        │  Web Push      │  (friend req, broadcast)
                                        │  Gemini API    │  (AI food parse)
                                        └────────────────┘
```

## Frontend

- **React 19 + Vite** SPA with TypeScript everywhere
- **Tailwind v4** with custom theme tokens; dark/light theme via `html.dark` / `html.light` class flip
- **TanStack Query v5** for server state with on-window-focus refetching for the dashboard
- **Zustand** with `persist` middleware for theme + auth state
- **React Router v7** with auth-guarded `/app/*` routes and admin-only `/app/admin`
- **Service Worker** built via `vite-plugin-pwa` `injectManifest` strategy — combines Workbox precache + Web Push handlers + skip-waiting message receiver
- **Auto-update toast** detects new SW versions and prompts the user to reload

### Feature module pattern

Each feature lives under `src/features/<name>/`:

```
features/
└── food-log/
    ├── components/   FoodLogForm, FoodLogList, FoodLogCard
    ├── hooks/        useFoodLogs, useCreateFoodLog, useDeleteFoodLog, useUpdateFoodLog
    ├── services/     food-log.api.ts (calls /api/food-logs via apiClient)
    ├── types/        food-log.types.ts
    └── index.ts      barrel export
```

Pages in `src/pages/` compose features. No business logic in pages — they're orchestration only.

## Backend (API)

We have **12 serverless functions exactly** because Vercel Hobby caps deployments at 12.

To stay under the cap, multi-route resources collapse into **single-file dispatcher patterns**:

- `?id=` query param → switches between list/create vs. detail/update/delete (food/workout/alcohol/weight/mental logs)
- `?action=` query param → multiple actions on the same resource (`users/me?action=push-subscribe|export|push-test`)
- `?resource=` query param → admin routes consolidated into `admin.ts`
- `?type=` query param → analytics dashboard vs. trends in one file
- Nested routes (`plans/[id]/entries.ts`) only when a true subresource needs its own owner check

Every handler:

1. Goes through `createHandler` factory which adds CORS + auth + try/catch
2. Auth via `verifyAuth` (any user) or `requireAdmin` (admin only)
3. Uses **service-role Supabase client** (`supabaseAdmin`) but explicitly scopes every query by `user.id`
4. Returns standardized `{ success, data }` or `{ success: false, error: { code, message } }` shapes

### Why service role + manual scoping (not user-JWT clients)

The dead-code path `createSupabaseClient(accessToken)` was meant to forward the user's JWT for RLS-scoped reads. We don't use it because:

1. Manual scoping with `.eq('user_id', user.id)` is one extra line per query and just as secure when the auth check is solid
2. RLS at the Supabase level still enforces the same rules for direct-from-frontend queries (Explore pages, GoalsPage, ActivityFeedPage)
3. Service role is required for `auth.admin.deleteUser`, push broadcast, and admin operations anyway

Result: belt + suspenders. RLS protects direct queries; manual scoping protects API routes.

## Database

- **Postgres 17** via Supabase
- **Row-Level Security** on every user-owned table
- **`is_admin()`** helper function used in policies for admin overrides
- **`bump_streak()`** trigger on every log INSERT to maintain `activity_streaks`
- **`compute_alcohol_free_streak()`** RPC called from `/api/analytics?type=dashboard` (sober days produce no row, so a trigger alone can't track them)
- **`are_friends()`** RPC used in friend-readable RLS policies
- **`friend_activity_feed`** view: UNION ALL across log tables, filtered by `share_with_friends = TRUE`. RLS on the underlying tables enforces friend-only visibility automatically

See [DATABASE.md](DATABASE.md) for the full schema.

## Auth

- Supabase Auth handles email + password, password reset, email confirmations
- Google OAuth via standard provider config (client ID + secret stored in Supabase, redirect to `/auth/v1/callback`)
- **Custom HTML email templates** for confirm + recovery, sent via **Resend SMTP** (configured in `supabase/config.toml`, pushed via `supabase config push`)
- **Custom domain** sender: `noreply@shakersplit.divyanshjha.in` (DKIM + SPF + DMARC verified at the registrar)

Frontend auth state in `useAuthStore` (zustand) + `useAuth` hook with `onAuthStateChange` subscription. `AuthGuard` wraps `/app/*`; `AdminGuard` wraps `/app/admin`.

## Storage

Single public bucket `photos` with RLS:

- **Read:** anyone (food photos, recipe photos)
- **Write:** authenticated user, only into `<user-uid>/<scope>/<filename>` (e.g. `<uid>/food/<uuid>.jpg`)

`PhotoUploader` component:

1. Receives a `File` from `<input type="file">`
2. Decodes via `createImageBitmap` (Safari) or `<img>` fallback
3. Resizes via canvas to max 1080px long edge, JPEG @ q=0.85
4. Uploads via `supabase.storage.from('photos').upload(...)` with the user's anon JWT
5. Returns the public URL

Stored on Supabase's free 1GB tier — at ~150KB/photo that's ~6,500 photos before we'd hit it.

## Push notifications

- **Standard Web Push** with VAPID — works on Chrome/Firefox/Edge desktop + Android, Safari macOS, **iOS 16.4+ ONLY when the PWA is installed via Add to Home Screen**
- `push_subscriptions` table stores one row per device per user (endpoint + p256dh + auth keys)
- `sendPushToUser(userId, payload)` helper fans out to all the user's devices, deletes 404/410 (stale) endpoints, updates `last_used_at` on success
- Triggers from:
  - `friendships POST` → notify addressee of new friend request
  - `friendships PATCH` (ACCEPTED) → notify requester
  - `admin POST ?resource=push` → broadcast to all subscribed users
- Service worker handles `push` (showNotification) + `notificationclick` (focus existing tab + navigate, or openWindow)

## AI food parser

- **Gemini Flash** via `@google/generative-ai` SDK
- Free tier (15 RPM, 1M tokens/day) is plenty for 80 users
- Endpoint: `POST /api/food-logs?action=parse-ai` body `{ description: string }`
- Returns Gemini's structured JSON response per a strict schema (meal_type, items, total_calories, total_protein_g, notes, confidence)
- Returns 503 gracefully if `GEMINI_API_KEY` not set — form falls back to manual entry

## Security model

| Boundary | Enforcement |
|---|---|
| Cross-user reads | RLS policies on every table (`user_id = auth.uid() OR is_admin()`) |
| Cross-user writes | Same RLS + manual `.eq('user_id', user.id)` in API routes |
| Admin-only endpoints | `requireAdmin()` middleware → 403 for non-ADMIN role |
| Photo uploads | Storage RLS: `auth.uid()::text = (storage.foldername(name))[1]` |
| Friend-readable logs | `share_with_friends = TRUE AND are_friends(auth.uid(), user_id)` policy |
| Friendship mutations | API verifies ownership before delete; only addressee can accept/decline |
| Email enumeration | Friend-request endpoint returns generic success; password-reset same |
| Self-deletion lockout | Admin can't delete or demote themselves via `/api/admin?resource=users` |
| OAuth redirect URLs | Allow-listed in `supabase/config.toml` `additional_redirect_urls` |
| CORS | Whitelist of `localhost:5173` + `shakersplit.vercel.app` + custom domain |
| Service role key | Server-side only, never shipped to client |
| VAPID private key | Server-side only |

## Cost analysis at scale

For 80 active users averaging 3 logs/day:

| Resource | Limit | Estimated usage | Headroom |
|---|---|---|---|
| Vercel function invocations | 100k/day | ~5k/day | 95% |
| Vercel bandwidth | 100GB/mo | ~3GB/mo | 97% |
| Supabase DB rows | unlimited | ~30k logs/yr | n/a |
| Supabase storage | 1GB | ~50MB photos | 95% |
| Supabase MAU | 50k | 80 | 99.8% |
| Resend emails | 3000/mo | ~50/mo | 98% |
| Gemini tokens | 1M/day | ~200k/day | 80% |
| Vercel Analytics events | 25k/mo | ~5k/mo | 80% |

The constraint that bites first is the **Vercel 12-function cap** — already hit. Adding more API surface requires consolidating into existing files via query-param dispatch.

The constraint that bites second is **Supabase storage at 1GB** if photo usage grows past expectation. Mitigation: enforce a max photo count per user, or migrate to Cloudflare R2 ($0.015/GB-month, far cheaper).
