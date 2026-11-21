# Bug Tracking

An internal, self-hosted bug and feedback tracker for managing private projects and collecting feedback from external users via a public submission form, Chrome MV3 extension, or project-scoped API keys.

## Stack

- **Web & API:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** PostgreSQL 16 + Prisma 6
- **Authentication:** Auth.js v5 Credentials provider with JWT sessions (single admin)
- **Browser Extension:** Plain Chrome Manifest V3 extension under `extension/` (no build step)

## Features

- **Projects & Public Forms:** Manage projects with unique slugs, optional live-site domains, GitHub repository URLs, and webhook URLs; collect unauthenticated feedback at `/submit/[slug]`.
- **Daily Triage Inbox:** Global `/feedback` inbox and per-project feedback lists with search (`q`), filtering (`projectId`, `status`, `type`, `priority`, `source`), sorting, pagination, inline status/priority updates, and project open-item counts.
- **AI Assistance:** On-demand feedback cleanup, structured formatting, type/priority suggestions, and duplicate detection (`POST /api/feedback/ai-triage`) using OpenAI (`OPENAI_API_KEY`), Gemini (`GEMINI_API_KEY`), or deterministic heuristic fallback (`AI_PROVIDER=heuristic`).
- **Richer Capture & Integrations:** Structured `pageUrl`, `browserInfo`, and visible-tab `screenshotDataUrl` capture from the Chrome extension; Slack, Discord, and generic JSON webhook notifications; and one-click GitHub issue promotion (`POST /api/feedback/[id]/github`).
- **Collaboration & Ops:** Internal admin notes and automatic status transition history (`/api/feedback/[id]/notes`), project-scoped API keys (`/api/projects/[id]/api-keys` + `POST /api/v1/feedback`), persistent PostgreSQL rate limiting (`RateLimitBucket`), CSV/JSON export (`GET /api/feedback/export`), and `npm run db:backup`.

## Local Development

1. **Create your `.env` file** from the example template:

   ```bash
   cp .env.example .env
   ```

   Update `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `AUTH_SECRET` (for example with `openssl rand -base64 32`).

   Optional integration environment variables:
   - `AI_PROVIDER` (`openai`, `gemini`, or `heuristic`)
   - `OPENAI_API_KEY`, `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
   - `GEMINI_API_KEY`, `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
   - `GITHUB_TOKEN` (personal access token with `repo` / `issues` scope for GitHub issue promotion)

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start PostgreSQL:**

   ```bash
   docker compose up -d db
   ```

4. **Apply database migrations and seed the admin user:**

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. **Run the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in at `/login` with your configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Programmatic Feedback API (`POST /api/v1/feedback`)

Create a project API key on `/projects/[id]`, then submit feedback with `Authorization: Bearer <key>` or `x-api-key: <key>`:

```bash
curl -X POST http://localhost:3000/api/v1/feedback \
  -H "Authorization: Bearer btk_your_project_key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Checkout timeout","type":"bug","priority":"high","description":"Timed out after 30s"}'
```

## Self-Hosted Docker Deployment

The repository includes a multi-stage standalone `Dockerfile` and a `docker-compose.yml` running both `db` (PostgreSQL 16) and `app` (Next.js standalone server on port `3000`).

1. **Configure `.env`** in the project root with your production `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (plus optional `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GITHUB_TOKEN`).

2. **Build and start the stack:**

   ```bash
   docker compose up -d --build
   ```

3. **Apply migrations and seed the admin user** against the database:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

4. **Verify health:**

   ```bash
   curl http://localhost:3000/api/health
   ```

   Expect HTTP `200` with `{"status":"ok","database":"connected"}`.

## Chrome Extension Configuration

The extension lives in `extension/` and submits feedback to `/api/submit/[slug]` without requiring admin credentials.

1. **Production host permission:** Before deploying for a live domain, update `extension/manifest.json` and replace `https://your-bug-tracker-domain.com/*` in `host_permissions` with your Bug Tracking origin (`http://localhost:3000/*` is already included for local development).
2. **Load unpacked in Chrome:**
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and choose the `extension/` folder
3. **Set the API origin:** Open the extension's **Options** page (`options.html`) and save your Bug Tracking origin (e.g. `http://localhost:3000` or `https://bugs.example.com`).
4. **Domain matching & capture:** The popup detects the active tab's hostname via `GET /api/lookup?domain=...` (falling back to `GET /api/projects/public-list`), supports optional visible-tab screenshot capture, and submits to `POST /api/submit/[slug]`.

## Backup, Verification & Testing

```bash
npm run db:backup  # Export projects, feedback, notes, history, and key metadata to backups/
npx tsc --noEmit   # TypeScript type-check
npm run lint       # ESLint
npm test           # Vitest unit and API route tests
npm run build      # Production Next.js standalone build
```
