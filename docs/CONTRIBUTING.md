# Contributing

This is a personal portfolio project but pull requests are welcome if you find a bug or have an idea.

## Local development

```bash
git clone https://github.com/shakersplit/shakersplit.git
cd shakersplit
npm install

# Set up your own Supabase project (see DEPLOYMENT.md) and create .env.local
cp .env.local.example .env.local
# fill it in

# Two terminals
npm run dev      # frontend at http://localhost:5173
vercel dev       # API at http://localhost:3000/api/*  (link your own Vercel project)
```

The Vite dev server proxies `/api/*` to `localhost:3000` (set in `vite.config.ts`).

## Code layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the high-level shape. The convention is:

- **Pages** in `src/pages/` are orchestration — they compose feature modules and don't contain business logic
- **Features** in `src/features/<name>/` own their types, services, hooks, and components
- **Shared UI** in `src/components/` (brand mark, layout, photo uploader, PWA toast)
- **API routes** in `api/` mirror their URL — `/api/food-logs` lives at `api/food-logs.ts`. Files under `api/_lib/` are shared (factories, middleware, repos, validators, utils)
- **Migrations** in `supabase/migrations/` numbered `00N_description.sql`, every one idempotent

## Conventions

### TypeScript

- Strict mode on. No `any` unless absolutely necessary, and always with a comment explaining why
- Prefer interface over type for object shapes
- Use Zod for runtime validation of all API inputs
- Single named export per file when reasonable

### React

- Function components only
- Hooks for state, no class components
- TanStack Query for all server state — never useState + useEffect for data fetching
- Zustand for client state that needs to persist (auth, theme)
- One component per file unless a child is private to its parent

### CSS

- Tailwind v4 utilities only — no `.css` modules
- Theme tokens in `src/styles/globals.css` (`--color-background`, `--color-food`, etc.)
- Dark/light theme via `html.dark` / `html.light` class flip
- Brand colors: `food` (green), `workout` (orange), `alcohol` (purple), `mental` (blue)

### API

- Every route uses `createHandler` factory which wraps in CORS + auth + try/catch
- Validate inputs with Zod schemas in `api/_lib/validators/`
- Scope every query by `user.id` even when RLS would catch it (defense in depth)
- Return `{ success: true, data }` or `{ success: false, error: { code, message, details? } }`
- Use the standard error codes documented in [API.md](API.md#standard-error-codes)

### Database

- All migrations idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.)
- Comments at the top of every migration explaining why it exists
- RLS policies named `<table>_<action>_<scope>` (e.g. `food_logs_select_own`, `food_logs_select_friends`)
- Use `is_admin()` in policies for admin override; never bypass RLS in policies

### Commits

Conventional commits, scoped:
```
feat(notifications): web push for friend requests
fix(api): consolidate to 12 functions for Vercel cap
docs(database): add streak trigger flow diagram
chore(deps): bump react-router to v7.2
```

Subject ≤ 72 chars; body wrapped at 80 with detail on motivation.

## Testing

There's no automated test suite right now. Reasoning: the app is small enough that visual + manual smoke testing covers more ground than maintaining E2E infra. If the project grows, the path is:

1. **Vitest** for unit tests of pure utilities (formatters, streak math)
2. **Playwright** for happy-path E2E (sign up, log a meal, see it in the list)
3. **Type tests** for API request/response shape compatibility (already partly enforced via shared types)

## Adding a new feature

1. **Plan the data model first.** Write a migration if you need new tables/columns. Apply via dashboard SQL editor before writing app code that depends on it.
2. **Add the API route** under `api/` — but only if direct-from-Supabase reads with RLS aren't sufficient. Many pages can read the DB directly.
3. **Watch the function count!** `find api -type f \( -name "*.ts" -o -name "*.js" \) -not -path 'api/_lib/*' -not -name "package.json" | wc -l` must stay ≤ 12 on Vercel Hobby. Consolidate via `?action=` / `?resource=` / `?id=` query-param dispatch.
4. **Build the frontend module** under `src/features/<name>/` with its own types/services/hooks/components.
5. **Add a page** under `src/pages/` that composes the feature.
6. **Wire it into the router** (`src/app/router.tsx`) and the **sidebar** (`src/components/layout/Sidebar.tsx`).
7. **Update docs.** README backlog at minimum, plus relevant section in `docs/`.

## Adding a new admin action

Admin endpoints live in `api/admin.ts` and dispatch on `?resource=` + `?id=`. To add e.g. recipe ratings management:

```ts
// In api/admin.ts handler
if (resource === 'ratings') {
  if (method === 'GET' && !id) return await handleListRatings(res);
  if (method === 'DELETE' && id) return await handleDeleteRating(res, id);
}
```

Add a corresponding tab to `AdminPage.tsx`.

## Watching the bundle

```bash
npm run build
# Watch the dist/ output sizes. The big chunks today are recharts and the SW.
# If anything balloons past 1MB gzipped, consider lazy-loading via dynamic import().
```

## Debugging push notifications

1. Open DevTools → Application → Service Workers — confirm `sw.mjs` is activated
2. Check Notification.permission in the console: `Notification.permission` should be `'granted'`
3. Open `chrome://serviceworker-internals/` in Chrome to manually fire a push event with a test payload
4. On iOS: the PWA must be opened from the home screen icon, not from a Safari tab. Notification.permission throws in a tab.
5. If sending fails server-side: `vercel logs <deploy-url>` and look for `Push send failed for <id>` lines
