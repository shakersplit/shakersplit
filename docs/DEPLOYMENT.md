# Deployment

How to set up ShakerSplit from scratch on Vercel + Supabase. Total cost: $0/month.

## Prerequisites

- Node 20+ and npm
- A free Supabase account
- A free Vercel account
- A free GitHub account
- (Optional) A custom domain — works fine on `<your-app>.vercel.app` too

## 1. Supabase project

1. Go to [supabase.com/dashboard/projects](https://supabase.com/dashboard/projects) → **New project**
2. Pick a region (Asia/India: ap-south-1; US: us-east-1)
3. Save the project ref (the random subdomain in the URL — e.g. `balwnfljjpofwieujguh`)
4. From the dashboard sidebar: Project Settings → API → copy these into your local `.env.local`:
   - `Project URL` → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never ship to client)

## 2. Apply migrations

The cleanest way is via the **Supabase Management API** (uses the same role the dashboard SQL editor does):

```bash
# Get a personal access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_PAT=sbp_...

# Apply each migration in order
for f in supabase/migrations/00*.sql; do
  echo "Applying $f"
  SQL=$(python3 -c "import json; print(json.dumps(open('$f').read()))")
  curl -sS -X POST \
    "https://api.supabase.com/v1/projects/<your-project-ref>/database/query" \
    -H "Authorization: Bearer $SUPABASE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $SQL}"
  echo
done
```

Or just open the dashboard SQL editor and paste them one at a time.

After 003 runs, **promote yourself to admin** by running:
```sql
UPDATE public.users SET role = 'ADMIN' WHERE email = '<your-email>';
```

## 3. Email — Resend SMTP

For production-grade email (custom branded sender, reliable delivery):

1. [resend.com/signup](https://resend.com/signup)
2. Create a Full Access API key (`re_...`) — copy into `RESEND_API_KEY`
3. Add a sending domain via the Resend API (or dashboard):
   ```bash
   curl -X POST 'https://api.resend.com/domains' \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"name":"yourdomain.com"}'
   ```
4. Resend returns 3 DNS records (DKIM TXT, SPF MX, SPF TXT). Add a 4th DMARC TXT yourself: `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`. Add all 4 at your registrar.
5. Once Resend reports `status=verified`, configure Supabase Auth to use it. Edit `supabase/config.toml`:
   ```toml
   [auth.email.smtp]
   enabled = true
   host = "smtp.resend.com"
   port = 587
   user = "resend"
   pass = "env(RESEND_API_KEY)"
   admin_email = "noreply@yourdomain.com"
   sender_name = "ShakerSplit"
   ```
6. Push the config:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   set -a && . ./.env.local && set +a   # so env() resolution works
   supabase config push
   ```

If you skip Resend, Supabase falls back to its built-in email service — fine for testing, but rate-limited to 4 emails/hour and shows up as `noreply@mail.app.supabase.io`.

## 4. Google OAuth

Google Cloud doesn't expose an API for creating consumer OAuth clients — this part is manual:

1. [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate) — name it
2. [console.cloud.google.com/auth/branding](https://console.cloud.google.com/auth/branding):
   - App name, support email
   - Authorized domains: add your custom domain (apex, e.g. `divyanshjha.in`)
   - Logo (optional, recommended)
   - Scopes: keep defaults (openid, email, profile)
   - Test users: add yourself + early testers (or publish to bypass — see below)
3. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth client ID → Web app
   - Authorized JS origins: `https://yourdomain.com`, `https://*.vercel.app`, `http://localhost:5173`
   - Authorized redirect URIs: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID + Secret. Add to `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=GOCSPX-...
   ```
5. Add the Google block to `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(GOOGLE_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
   skip_nonce_check = false
   ```
6. `supabase config push` to deploy.

For >100 users: publish the OAuth app at console.cloud.google.com/auth/audience. With only basic scopes, no formal verification needed.

## 5. Push notifications — VAPID

Generate a VAPID keypair:

```bash
npm i web-push
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Add to `.env.local`:

```bash
VITE_VAPID_PUBLIC_KEY=B...     # public, shipped to client
VAPID_PRIVATE_KEY=...           # server-side only
VAPID_SUBJECT=mailto:you@example.com
```

These also need to go into Vercel env vars (next step).

## 6. AI food parser (optional)

Free Gemini Flash:

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → create key
2. Add `GEMINI_API_KEY=AIza...` to `.env.local` and Vercel

Free tier: 15 requests/minute, 1M tokens/day. Plenty for 80 users. No credit card needed.

If you don't set this, the AI parser endpoint returns 503 gracefully and the form falls back to manual entry.

## 7. Storage policies

The `005_photos_storage.sql` migration creates the bucket but the storage RLS policies have to be applied separately (the Management API can install them, but the bucket creation needs the storage REST API). Run:

```bash
# Create bucket via Storage API
curl -X POST "https://<your-ref>.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"photos","name":"photos","public":true,"file_size_limit":10485760,"allowed_mime_types":["image/jpeg","image/png","image/webp","image/heic"]}'

# Apply policies via Management API (run the policy CREATE statements from 005)
```

Verify via:
```sql
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'storage.objects'::regclass;
```

You should see 4 photos_* policies.

## 8. Vercel project

1. Push your code to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo
3. Vercel auto-detects Vite — no framework config needed
4. **Environment Variables** section: add all of these in **Production** scope:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_APP_URL` — your production URL (e.g. `https://shakersplit.divyanshjha.in`)
   - `RESEND_API_KEY` (if using Resend)
   - `GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
   - `VITE_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `GEMINI_API_KEY` (if using AI parser)
5. Click Deploy. First build takes ~30s.

## 9. Custom domain (optional)

If you have a domain (e.g. via Namecheap, Hostinger, Cloudflare):

1. From Vercel project → Settings → Domains → Add `yourdomain.com` (or `app.yourdomain.com`)
2. Vercel shows you a CNAME or A record to add at your registrar
3. After DNS propagates (~5 min), Vercel auto-provisions a Let's Encrypt SSL cert

If you also want branded email at this domain, repeat the Resend domain verification (step 3) for it.

## 10. Smoke test

After deploy:
```bash
# Should return 401 with proper error JSON (auth required is correct)
curl -s https://yourdomain.com/api/users/me

# SW served at root
curl -I https://yourdomain.com/sw.js

# Manifest
curl -s https://yourdomain.com/manifest.webmanifest | head
```

Then open the site → sign up → log a meal → check it appears in the list.

## Common gotchas

| Symptom | Fix |
|---|---|
| Vercel build fails: "exceeded_serverless_functions_per_deployment" | You added a 13th function. Consolidate via `?action=` or `?id=` query-param dispatch |
| API returns "exports is not defined" | Add `api/package.json` with `{"type": "commonjs"}` (already in repo) |
| Photos fail to upload | Storage RLS policies aren't installed; see step 7 |
| iOS doesn't show push permission | PWA must be **installed via Add to Home Screen**, not run in a Safari tab |
| Google sign-in shows raw `xxx.supabase.co` instead of app name | OAuth consent screen needs Authorized domain + app logo |
| Streak shows 0 after logging | Check trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%streak%';` |
| `supabase config push` fails to substitute env() | You forgot `set -a && . ./.env.local && set +a` first |
| Email lands in spam | DMARC needs to be set up; warm the domain by sending a few legit emails first |

## CI/CD

Every push to `master` auto-deploys to Vercel production. Pull requests get preview URLs. No additional CI setup needed.

For database migrations: there's no auto-apply pipeline. New migrations must be applied manually via Management API or the dashboard SQL editor before pushing code that depends on them.
