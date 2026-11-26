# Bug Tracking App — Project Instructions

This file gives coding assistants the context needed to work on this repository consistently. Read it before making changes.

## What this app is

An internal, self-hosted bug and feedback tracker. It manages private repositories and collects feedback from external users of those repositories via public forms, a Chrome MV3 extension, or project-scoped API keys. It is not a public SaaS product; it is built for a private workflow.

## Completed Phases & Milestones

- **Phases 1–5 + Milestone 0 (MVP Stabilization):** Projects CRUD, FeedbackItem CRUD, public `/submit/[slug]` form, single-admin Auth.js v5 authentication, Chrome MV3 extension, production standalone Dockerfile, `/api/health`, defense-in-depth `requireAdminApiSession()` checks, and Vitest test suite.
- **Milestone 1 (Daily Triage & Admin UX):** Global `/feedback` inbox, search/filter/sort/pagination (`lib/feedback-query.ts`), inline status/priority updates (`PATCH /api/feedback/[id]`), source badges, and open-item counts.
- **Milestone 2 (Phase 6 — AI Assistance):** Feedback cleanup/structuring, type/priority suggestions, and duplicate detection (`lib/ai-triage.ts`, `POST /api/feedback/ai-triage`) with configurable provider (`openai`, `gemini`, or `heuristic`) and automatic heuristic fallback.
- **Milestone 3 (Richer Capture & Integrations):** Structured `pageUrl`, `browserInfo`, `screenshotDataUrl` columns, extension screenshot capture, Slack/Discord/generic webhook notifications (`lib/notifications.ts`), and GitHub issue promotion (`lib/github.ts`, `POST /api/feedback/[id]/github`).
- **Milestone 4 (Collaboration & Ops Hardening):** Internal admin notes and status transition history (`FeedbackNote`, `FeedbackStatusEvent`, `/api/feedback/[id]/notes`), project API keys (`ProjectApiKey`, `/api/projects/[id]/api-keys`, `POST /api/v1/feedback`), persistent DB rate limiting (`RateLimitBucket`, `lib/rate-limit.ts`), CSV/JSON export (`GET /api/feedback/export`), and `npm run db:backup` (`scripts/backup-data.ts`).

## Stack

- **Next.js 16** with App Router, TypeScript, and Tailwind CSS v4.
- **PostgreSQL 16** via Docker Compose for local development and self-hosted Docker deployment.
- **Prisma 6** as the ORM.
- **Auth.js v5** Credentials provider with JWT sessions for the single admin.
- A plain JavaScript/HTML/CSS Chrome Manifest V3 extension under `extension/` with no build step.
- No component library; keep the web UI in plain Tailwind CSS.

## Conventions

- **API routes:** REST-style routes under `app/api/<resource>/route.ts` and `app/api/<resource>/[id]/route.ts`. Never export non-handler symbols from Next.js `route.ts` files.
- **Database access:** Always use the shared `lib/prisma.ts` client singleton. Never instantiate `PrismaClient` elsewhere.
- **IDs:** Use `cuid()` rather than auto-incrementing integers.
- **Slugs:** User-facing URL segments must be unique. Use `lib/slug.ts` and append `-1`, `-2`, and so on for collisions.
- **Domains:** Normalize live-site domains to lowercase hostnames via `lib/domain.ts`. A Project's optional `domain` is unique when set and is separate from `repoUrl`.
- **Client versus server components:** Default to server components. Use client components only for interactive forms, buttons, and browser APIs. Never import runtime `@prisma/client` enum objects inside `"use client"` components (use `import type` and `lib/feedback-display.ts`).
- **Styling:** Developer Workbench (Linear / Vercel style) in plain Tailwind CSS v4 (`max-w-5xl` for admin lists, inbox, and 2-column `lg:grid-cols-[1fr_340px]` detail pages; `max-w-2xl` / `max-w-xl` / `max-w-sm` for standalone creation, public submission, and login forms).
- **Authentication:** `/projects/*`, `/feedback/*`, `/api/projects/*`, and `/api/feedback/*` are protected via both `middleware.ts` and `requireAdminApiSession()` / `requireAdminSession()` in `lib/auth.ts`. `/submit/*`, `/api/submit/*`, `/api/lookup`, `/api/projects/public-list`, and `/api/health` are intentionally public. `/api/v1/feedback` authenticates via scoped `ProjectApiKey` bearer / `x-api-key` headers.
- **Public API notes:** `/api/lookup?domain=...` returns only `{ found, slug, name }` for a matching domain. `/api/projects/public-list` returns only public-safe `{ slug, name }` records for the extension fallback picker.

## Data model

- **Project:** `id`, `name`, `slug` (unique), `domain?` (unique), `repoUrl?`, `webhookUrl?`, `description?`, `createdAt`, `updatedAt`; has many `FeedbackItem` and `ProjectApiKey` records with cascade deletion.
- **FeedbackItem:** `id`, `projectId`, `title`, `description?`, `type`, `status`, `priority?`, `source`, `reporterName?`, `reporterEmail?`, `pageUrl?`, `browserInfo?`, `screenshotDataUrl?`, `githubIssueUrl?`, `githubIssueNumber?`, `createdAt`, `updatedAt`; has many `FeedbackNote` and `FeedbackStatusEvent` records with cascade deletion.
- **FeedbackNote:** `id`, `feedbackItemId`, `authorEmail`, `body`, `createdAt`.
- **FeedbackStatusEvent:** `id`, `feedbackItemId`, `fromStatus?`, `toStatus`, `actorEmail`, `createdAt`.
- **ProjectApiKey:** `id`, `projectId`, `name`, `keyPrefix`, `keyHash` (unique), `lastUsedAt?`, `revokedAt?`, `createdAt`.
- **RateLimitBucket:** `key` (PK), `count`, `windowStart`, `updatedAt`.
- **AdminUser:** `id`, `email` (unique), `passwordHash`, `createdAt`, seeded from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Verification

- Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` after changes.
- Do not commit unless ready and verified. After finishing a task, provide a concise summary of what changed and verified results.
