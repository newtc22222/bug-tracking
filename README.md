# Bug Tracking

An internal, self-hosted bug and feedback tracker for managing private projects and collecting feedback from external users via a public submission form or Chrome extension.

## Stack

- **Web & API:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** PostgreSQL 16 + Prisma 6
- **Authentication:** Auth.js v5 Credentials provider with JWT sessions (single admin)
- **Browser Extension:** Plain Chrome Manifest V3 extension under `extension/` (no build step)

## Local Development

1. **Create your `.env` file** from the example template:

   ```bash
   cp .env.example .env
   ```

   Update `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `AUTH_SECRET` (for example with `openssl rand -base64 32`).

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

## Self-Hosted Docker Deployment

The repository includes a multi-stage standalone `Dockerfile` and a `docker-compose.yml` running both `db` (PostgreSQL 16) and `app` (Next.js standalone server on port `3000`).

1. **Configure `.env`** in the project root with your production `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. (`docker-compose.yml` configures `DATABASE_URL` inside the container network to point at `db:5432` and enables `AUTH_TRUST_HOST=true`.)

2. **Build and start the stack:**

   ```bash
   docker compose up -d --build
   ```

3. **Apply migrations and seed the admin user** against the database (for example from a host with `.env` configured to reach Postgres on port `5432`):

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

1. **Production host permission:** Before deploying for a live domain, update `extension/manifest.json` and replace `https://your-bug-tracker-domain.com/*` in `host_permissions` with your Bug Tracking origin. (`http://localhost:3000/*` is already included for local development.)
2. **Load unpacked in Chrome:**
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and choose the `extension/` folder
3. **Set the API origin:** Open the extension's **Options** page (`options.html`) and save your Bug Tracking origin (e.g. `http://localhost:3000` or `https://bugs.example.com`).
4. **Domain matching & fallback:** When opened on a tab, the popup looks up the hostname via `GET /api/lookup?domain=...`. If no project has a matching live-site domain, it loads `GET /api/projects/public-list` so the user can choose a project manually.

## Verification & Testing

```bash
npx tsc --noEmit   # TypeScript type-check
npm run lint       # ESLint
npm test           # Vitest unit and API route tests
npm run build      # Production Next.js standalone build
```
