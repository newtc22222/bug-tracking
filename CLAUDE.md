\# Project Instructions — Bug Tracking App



This file gives any LLM coding assistant (Claude Code, Cursor, etc.) the context needed to work on this repo consistently. Read this before making changes.



\## What this app is

An internal, self-hosted bug/feedback tracker. I use it to manage my own private repos and collect feedback (bugs, improvements, feature requests) from external users of those repos. Not a public product — built for my own workflow.



\## Current phase

We are building \*\*incrementally\*\*. Check with me before jumping ahead to a phase that isn't listed as "in progress" below.



1\. \*\*Projects CRUD\*\* — in progress / done (admin can create, list, edit, delete projects)

2\. \*\*FeedbackItem CRUD\*\* — next up

3\. \*\*Public feedback submission form\*\* (`/submit/\[slug]`)

4\. \*\*Auth\*\* (admin login, protect admin routes/API)

5\. \*\*Browser extension\*\* (submits feedback with page context — URL, screenshot, browser info)

6\. \*\*AI assistance\*\* (clean up/structure raw feedback text, duplicate detection)



Don't build ahead of the current phase without asking — the schema and API are meant to grow incrementally, not be over-engineered up front.



\## Stack

\- \*\*Next.js\*\* (App Router, TypeScript, Tailwind) — one codebase for admin UI, public form, and API routes

\- \*\*PostgreSQL\*\* via Docker Compose for local dev; self-hosted (e.g. Docker on a VPS) for production — no managed cloud DB

\- \*\*Prisma\*\* as the ORM

\- No component library (e.g. no shadcn/MUI) unless I ask for one — keep it plain Tailwind



\## Conventions

\- \*\*API routes\*\*: REST-ish, under `app/api/<resource>/route.ts` and `app/api/<resource>/\[id]/route.ts`. Standard verbs: GET (list/read), POST (create), PUT (update), DELETE.

\- \*\*DB access\*\*: always through the shared `lib/prisma.ts` client singleton — never instantiate `PrismaClient` elsewhere.

\- \*\*IDs\*\*: `cuid()`, not auto-increment integers.

\- \*\*Slugs\*\*: any user-facing/public URL segment (e.g. project slugs) must be unique; use `lib/slug.ts` and handle collisions by appending `-1`, `-2`, etc.

\- \*\*Validation\*\*: basic required-field checks in the API route itself is fine for now — no need for a schema validation library (zod etc.) until the data model stabilizes.

\- \*\*Client vs server components\*\*: default to server components; only mark `"use client"` when the page needs interactivity (forms, buttons with handlers).

\- \*\*Styling\*\*: minimal, clean, narrow centered layouts (`max-w-2xl` for lists/dashboards, `max-w-md` for forms). No heavy visual design work until the core flows work — function first.



\## Data model so far

```

Project

\- id, name, slug (unique), repoUrl?, description?, createdAt, updatedAt



FeedbackItem (planned, not yet built)

\- id, projectId (FK)

\- title, description

\- type: bug | improvement | feature | question

\- status: open | in\_progress | resolved | closed

\- priority: low | medium | high (nullable)

\- source: manual | public\_form | extension | api

\- reporterName?, reporterEmail?

\- createdAt, updatedAt

```

Keep `source` and `reporter\*` fields even before the extension exists — avoids a migration later.



\## Explicitly out of scope until asked for

\- Auth (until phase 4)

\- Browser extension (phase 5)

\- AI features (phase 6)

\- Notifications, comments/threads, file attachments

\- Any third-party auth/component/UI library — ask first



\## When implementing a task

\- Stick to the scope described in my prompt for that session — don't silently add features from later phases "while you're in there."

\- If something in this file conflicts with what I ask for in a given session, my in-session instructions win, but flag the conflict so I know the docs may need updating.

\- After finishing a task, give a short summary of what changed and how to run/verify it — not a full narration of every file touched.

