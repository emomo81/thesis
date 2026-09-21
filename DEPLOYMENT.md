# Academa web application — deployment guide

The repository now contains **two interfaces** for the same packaged models:
- Existing offline Streamlit dashboard: `app.py` (unchanged deployment path).
- New Next.js website: `web/`, with accounts and PostgreSQL-backed prediction history.

## Architecture

```text
Browser
  │ HTTPS, same-origin requests (no browser calls to Render or localhost)
  ▼
Next.js on Vercel (React UI + Node.js route handlers)
  ├── Supabase Auth: sign-up, email confirmation, login, recovery, sessions
  ├── Supabase PostgreSQL: owner-isolated results + atomic usage limits
  └── HTTPS + server-only shared secret
        ▼
      FastAPI on Render
        └── Three existing trusted joblib pipelines; inference only
```

The Python model cannot be imported directly into Node.js. The Next.js **Node.js
API routes** serve as the application backend; a separate Express server is not
needed. A small Python API runs the existing scikit-learn pipelines on Render.
This is one deployment spanning three platforms, not three independent copies
of the application. Supabase hosts authentication/PostgreSQL, not the website.

## Included functionality

- Responsive landing page, methodology/model page, privacy/responsible-use page.
- Supabase email/password sign-up, email confirmation callback, login, logout,
  password recovery and password change.
- Server-validated protected dashboard and prediction/history API routes.
  Auth cookies are HttpOnly and SameSite=Lax, and Secure in production.
- Single-profile predictions at three stages; strict required-field validation.
- Comma/semicolon CSV uploads with templates; **250 profiles / 256 KB per file**.
- Outcome probabilities, CSV downloads, model version, and validation warnings.
- Optional saved history (off by default), pagination, inspection, downloads,
  deletion, and account-level summary statistics.
- Owner-based PostgreSQL row-level security and a database-backed usage quota
  of **30 prediction requests or 3,000 rows per rolling one-hour window per user**.
- Sample workspace at `/demo`: precomputed results for synthetic profiles. It
  neither bypasses authentication nor accepts arbitrary unauthenticated predictions.
- No raw student inputs in saved history; no third-party analytics or remotely
  fetched fonts. Both fonts are bundled locally using Fontsource packages.

There is no public registration backend without Supabase configuration. Missing
configuration produces an explicit setup notice, not simulated account creation.

## 1. Create and configure Supabase

1. Create a Supabase project in an institutionally appropriate region.
2. In the SQL editor, run the complete file:
   `supabase/migrations/202609140001_prediction_workspace.sql`.
   Alternatively apply it with your own linked Supabase CLI workflow.
   The migration is a one-time initial migration; do not run it repeatedly.
3. In Authentication → Providers, enable **Email** and **Confirm email**.
4. In Authentication → URL Configuration, set the **Site URL** to your canonical
   website, e.g. `https://academa.example.org`.
5. Add the following exact redirect URLs:
   - `https://academa.example.org/auth/callback`
   - `https://academa.example.org/auth/callback?next=/reset-password`
   - For local testing only: `http://localhost:3000/auth/callback` and
     `http://localhost:3000/auth/callback?next=/reset-password`.
   Supabase supports URL patterns if needed, but restrict them to your owned
   environments. Do not allow arbitrary domains.
6. Use the standard confirmation/recovery email templates with
   `{{ .ConfirmationURL }}`. The application uses PKCE and exchanges the returned
   `code` in `/auth/callback`; the safe destinations are `/dashboard` and
   `/reset-password` only. Complete confirmation/recovery in the same browser
   that initiated it so the PKCE verifier cookie is available.
7. Configure **custom SMTP** before real registration. Supabase's default email
   delivery has restrictions and is not a production email service. Configure
   provider rate limits and a minimum password length of 12 or greater. If enabling
   CAPTCHA, also integrate its token flow before opening registration; this
   version does not include a CAPTCHA widget.
8. Copy the project URL and **publishable key** (or legacy `anon` key) from project
   settings into Vercel. These are intended to be public. The website never needs
   a Supabase service-role/secret admin key.

The `prediction_runs` table enables RLS: only the owning authenticated user can
select, insert or delete their rows. Update permission is disabled. Both quota
and summary functions validate identity through Supabase's authenticated context.
The quota's SECURITY DEFINER function has an empty search path and tightly
controlled execution privileges. No browser can directly edit quota rows.

## 2. Deploy the model API on Render

1. Deploy this repository using **New → Blueprint**, selecting `render.yaml`.
2. Render builds `service/Dockerfile` with the repository root as Docker context.
   It includes only the service, inference module, pinned dependencies and model
   artifacts—not student-level training files.
3. The blueprint generates a private `MODEL_API_KEY` automatically. Keep it in
   Render/Vercel secret settings, never in source files or chat. Copy the same
   value into Vercel's `MODEL_API_KEY` environment variable.
4. The service starts Uvicorn bound to `0.0.0.0:$PORT`. Check that `/health`
   returns `{"status":"ok"}`. Health is public; prediction requires the secret.
5. Copy the HTTPS service origin, e.g. `https://academa-model-api.onrender.com`,
   into Vercel's `MODEL_API_URL` (no `/v1/predict` suffix).

The blueprint uses the **free** instance type so it can be deployed without a
paid Render plan. Free instances sleep after roughly 15 minutes of inactivity,
and the cold start that follows can exceed the website's 45-second model-call
timeout. The first prediction after an idle period therefore fails with the
retryable "The model service did not respond. It may be starting up" notice;
retrying once the service is awake succeeds. For uninterrupted use, change
`plan:` in `render.yaml` to `starter` (paid) and review current pricing. If
selecting any other tier, verify memory and request latency.

A single Uvicorn worker loads all models at startup, verifies hashes and versions,
and limits concurrent model work. No training occurs. A missing/short secret or
invalid model bundle stops startup.

Render-only manual setup, if not using Blueprints:
- Runtime: Docker
- Dockerfile: `service/Dockerfile`
- Build context: repository root
- Health check: `/health`
- `MODEL_API_KEY`: a randomly generated private value of at least 32 characters

Do **not** deploy the root `Dockerfile` as the new model API: the root Dockerfile
is for the existing Streamlit application.

## 3. Deploy the website on Vercel

1. Import the repository, or upload it using your own Vercel CLI workflow.
2. Set **Root Directory: `web`** and **Framework Preset: Next.js**.
3. Select **Node.js 22.x**. Keep default commands (`npm install`/`npm run build`).
   The committed `package-lock.json` pins the resolved dependency tree.
4. Configure these environment variables for the intended deployment environment:

| Variable | Example / purpose | Browser-visible? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://PROJECT.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable or legacy anon key | Yes |
| `APP_URL` | Canonical website origin, e.g. `https://academa.example.org` | No |
| `MODEL_API_URL` | Render's HTTPS service origin | No |
| `MODEL_API_KEY` | Same generated private secret as Render | **Never** |

5. Deploy, then align Supabase's Site URL/redirects and `APP_URL` with the final
   domain. Redeploy after changing public environment variables: Next.js embeds
   those values at build time. Use a stable canonical domain for auth.
6. For preview deployments with real authentication, explicitly configure the
   preview origin and its Supabase redirects. Production mutation requests are
   accepted only from `APP_URL`; arbitrary Vercel preview aliases are not trusted.

No database password or model secret belongs in a `NEXT_PUBLIC_` variable. Do
not disable auth or RLS to make a preview work. Vercel calls Render server-to-server;
there is intentionally no permissive CORS middleware on the model service.

The prediction route has a 60-second execution budget and a 45-second model-call
timeout. Confirm your Vercel plan supports that duration. The browser timeout is
55 seconds. Request JSON is capped at 1 MB, below Vercel's normal request-body
limit. Timeouts fail with a retryable error instead of fabricated results.

## 4. Local development

Prerequisites: Node.js 22+, Python 3.11/3.12 and a configured Supabase project.
The public site and demo require only Node; no external credentials are needed.

```bash
cd web
npm ci
# Optional for public-site preview; necessary for real accounts/predictions:
cp .env.example .env.local
# Edit .env.local privately using the values above.
npm run dev
```

In another terminal, from the repository root:

```bash
python3 -m venv .venv
.venv/bin/pip install -r service/requirements.lock
# Set MODEL_API_KEY privately in your shell or environment manager.
# It must match web/.env.local and have at least 32 random characters.
.venv/bin/python -m uvicorn service.api:app --host 0.0.0.0 --port 8000
```

For local use, `APP_URL=http://localhost:3000` and
`MODEL_API_URL=http://127.0.0.1:8000`. This localhost URL is **server-only**, not a
browser endpoint. For a hosted Arena preview with connected services, set APP_URL
to the actual HTTPS preview origin and add that origin's callbacks to Supabase.
Production requires an HTTPS model URL. Never commit `.env.local`.

## 5. Verification

```bash
# Frontend types, unit tests and real PostgreSQL (PGlite) policy tests
cd web
npm run typecheck
npm test
npm run build

# Public browser tests: run against the development server, without Supabase env
npx playwright install chromium
npm run dev  # separate terminal
npm run test:e2e

# From repository root: existing dashboard + inference HTTP tests
.venv/bin/pip install -r requirements.lock -r service/requirements.lock pytest==8.4.2 httpx==0.28.1
.venv/bin/python -m pytest -q
```

A custom local Chromium can be provided with `CHROMIUM_PATH`; tests also support
`TEST_BASE_URL`. PostgreSQL tests execute the actual migration against PGlite
with minimal test-only Supabase auth primitives. They verify two-user isolation,
forbidden cross-user writes/deletes, anonymous access denial, quotas and resets.
They do not substitute for testing the actual hosted Supabase project.

### Required real-deployment acceptance checks

These require your connected projects and have **not** been performed by the agent:

1. Register an account and receive/complete the confirmation email.
2. Sign in, refresh a protected page, sign out, and verify access is blocked.
3. Complete a password-reset email and sign in with the new password.
4. Run a real single prediction and a CSV batch at each stage.
5. Save results, confirm they appear, download them and delete a run.
6. Create a second account. Confirm it cannot view/delete the first account's
   results (UI and direct Supabase requests).
7. Exercise quota exhaustion, an invalid CSV, an expired session, and Render downtime.
8. Verify regional hosting, email delivery, account-deletion process and backup
   retention. Review model fairness/calibration and institutional authorization.

## Data handling and security boundaries

- This is a **research prototype**, not an approved student screening system.
- Saving is opt-in. History stores probabilities and metadata only, not profiles.
  CSV exports use row numbers, not names or uploaded identifiers. Keep your original
  file securely if you need to match rows; the app does not retain it.
- Request processing uses server memory; server operators/providers necessarily
  process those values. The application does not intentionally log them, but
  provider infrastructure/backup policies still require review.
- Saved runs remain until the user deletes them or the operator deletes the user.
  User deletion cascades to active history/quota rows. Provider backups may retain
  copies according to their policy. No automatic timed-retention job is included.
- Publish your organization's real support/privacy contact before public release.
  Self-service deletion is provided for runs, not authentication accounts; account
  deletion requires an operator in Supabase.
- RLS protects confidentiality between accounts. An owner may insert their own
  records through the public authenticated database API: history is personal
  working data, **not a cryptographically attested model audit log**.
- Quotas limit authenticated model API usage. Add provider/WAF protections and
  monitor storage abuse before exposing unrestricted public registration.
- Never accept uploaded joblib models. Pickle is unsafe for untrusted files. Model
  hash verification detects accidental corruption, not replacement of both the
  artifact and manifest by an attacker with deployment access.
- Credentials are not included. No live cloud resources have been provisioned by
  these source changes, and live Supabase email/auth flows need verification.

## Model updates

Run offline packaging only when intentionally retraining:

```bash
python scripts/package_models.py
python scripts/export_web_catalog.py
```

The second command exports UI field definitions and three clearly synthetic,
precomputed demo profiles. It does not copy training records or model weights
into the website. Publish the updated `artifacts/` and web catalog together: the
website rejects API results from a model version different from its input schema.
Regenerate the model card and re-evaluate before deploying new models.

## Existing Streamlit release

`python scripts/build_release.py` continues to build the separate offline
Streamlit ZIP. It is **not** the Next.js deployment package. Use the full repository
with `web/`, `service/`, `artifacts/` and `supabase/` for the cloud application.
