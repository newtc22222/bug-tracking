# Bug Tracking App — Project Instructions

This file gives coding assistants the context needed to work on this repository consistently. Read it before making changes.

## What this app is

An internal, self-hosted bug and feedback tracker. It manages private repositories and collects feedback from external users of those repositories. It is not a public product; it is built for a private workflow.

## Current phase

The app is being built incrementally. Do not jump ahead of the next phase without confirmation. The completed phases are:

1. **Projects CRUD** — done. Admin users can create, list, edit, and delete projects.
2. **FeedbackItem CRUD** — done. Admin users can create, list, filter, edit, and delete feedback items.
3. **Public feedback submission form** — done. External users can submit feedback at `/submit/[slug]` without authentication.
4. **Auth** — done. Admin pages and admin APIs require the single-admin Auth.js session.
5. **Browser extension** — done. A plain Chrome Manifest V3 extension detects project domains, supports a manual project fallback, and submits contextual feedback through the public API.
6. **AI assistance** — next / not started. It may clean up or structure raw feedback text and detect duplicates.

Do not build ahead of the current phase. The schema and API should grow incrementally rather than being over-engineered up front.

## Stack

- **Next.js** with App Router, TypeScript, and Tailwind CSS.
- **PostgreSQL** via Docker Compose for local development and self-hosted Docker deployment.
- **Prisma** as the ORM.
- Auth.js v5 Credentials provider with JWT sessions for the single admin.
- A plain JavaScript/HTML/CSS Chrome Manifest V3 extension under `extension/` with no build step.
- No component library; keep the web UI in plain Tailwind CSS.

## Conventions

- **API routes:** REST-style routes under `app/api/<resource>/route.ts` and `app/api/<resource>/[id]/route.ts`. Use GET for list/read, POST for create, PUT for update, and DELETE for removal.
- **Database access:** Always use the shared `lib/prisma.ts` client singleton. Never instantiate `PrismaClient` elsewhere.
- **IDs:** Use `cuid()` rather than auto-incrementing integers.
- **Slugs:** User-facing URL segments must be unique. Use `lib/slug.ts` and append `-1`, `-2`, and so on for collisions.
- **Domains:** Normalize live-site domains to lowercase hostnames. A Project's optional `domain` is unique when set and is separate from `repoUrl`.
- **Validation:** Basic required-field and length validation in API routes is sufficient until the data model stabilizes. Public input must be treated as untrusted.
- **Client versus server components:** Default to server components. Use client components only for interactive forms, buttons, and browser APIs.
- **Styling:** Keep layouts minimal, clean, narrow, and centered. Use `max-w-2xl` for lists and dashboards and `max-w-md` for forms.
- **Authentication:** `/projects/*`, `/feedback/*`, `/api/projects/*`, and `/api/feedback/*` are protected. `/submit/*`, `/api/submit/*`, `/api/lookup`, and `/api/projects/public-list` are intentionally public.
- **Public API notes:** `/api/lookup?domain=...` returns only `{ found, slug, name }` for a matching domain. `/api/projects/public-list` returns only public-safe `{ slug, name }` records for the extension fallback picker. The full admin `/api/projects` endpoint stays protected.

## Data model

### Project

- `id`, `name`, `slug` (unique), `domain?` (unique when set), `repoUrl?`, `description?`, `createdAt`, `updatedAt`
- Has many `FeedbackItem` records with cascade deletion.

### FeedbackItem

- `id`, `projectId` (foreign key), `title`, `description?`
- `type`: `bug | improvement | feature | question`
- `status`: `open | in_progress | resolved | closed`
- `priority`: `low | medium | high | null`
- `source`: `manual | public_form | extension | api`
- `reporterName?`, `reporterEmail?`, `createdAt`, `updatedAt`
- Extension submissions append page URL and browser information to `description` in a delimited context block. Structured context columns may be considered later if needed.

### AdminUser

- `id`, `email` (unique), `passwordHash`, `createdAt`
- Seeded from `ADMIN_EMAIL` and `ADMIN_PASSWORD` using `prisma/seed.ts`.

## Explicitly out of scope until asked for

- AI-assisted feedback cleanup and duplicate detection.
- Screenshot capture and image storage.
- Firefox/Safari support and Chrome Web Store publishing.
- Notifications, comments or threads, file attachments, and status history.
- CAPTCHA or advanced distributed rate limiting beyond the public form's honeypot and basic in-memory limiter.
- Additional users, roles, permissions, password reset, and email verification.
- Third-party authentication or UI component libraries beyond the already implemented Auth.js integration.

## When implementing a task

- Stick to the scope described in the current prompt and do not silently add later-phase features.
- If this file conflicts with an in-session instruction, the in-session instruction wins, but flag the conflict so this file can be updated.
- After finishing a task, provide a short summary of what changed and how to run or verify it.
