# Bug Tracking (`v0.2.0`)

A self-hosted, multi-project developer workbench and rapid bug tracker combining Linear/Jira triage workflows with effortless intake via public forms, a Chrome MV3 extension, REST API keys, and a built-in MCP server.

For complete documentation, workflows, webhook setup, and MCP snippets, see **[docs/WIKI.md](docs/WIKI.md)**, **[docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md)**, **[docs/ROADMAP.md](docs/ROADMAP.md)**, or visit `/guide` inside the running app.

## Stack

- **Web & API:** Next.js 16 (App Router, `proxy.ts`, TypeScript, Tailwind CSS v4)
- **Database:** PostgreSQL 16 + Prisma 6
- **Auth:** Auth.js v5 Credentials provider + scoped `btk_*` project API keys
- **Rich Text & Visualizations:** Tiptap WYSIWYG (pure Markdown storage), Recharts, `@dnd-kit/core`, `driver.js`
- **Browser Extension:** Chrome Manifest V3 (`extension/`, v0.2.0, zero build step)

## Key Features

- **Linear-Style Workbench Shell:** Collapsible left sidebar with Command Palette (`Ctrl/⌘ + K`), Quick Create (`C`), pinned Saved Views, Project quick-switcher, **Dark / Light / System** modes + **5 Accent Themes**, and configurable layout width (`Full 100%` / `Wide` / `Narrow`).
- **Strict 6-State Workflow & Ticket Keys:** Sequential keys (`WEB-12`), `Urgent` priority, `Type → Priority → Status` triage order, and strict workflow enforcement (`Open → To Do → In Progress → Blocked → Resolved → Closed`) with an interactive linear SVG workflow diagram.
- **4 Views + Flexible Surfaces:** Full Scroll List, Fixed-Height List, Card Grid, and strict-workflow Kanban board; Page / Modal / Drawer presentation modes with URL-synced Review Drawer (`?ticket=...`) and `J`/`K` rapid stepping.
- **Collaboration & Organization:** Tiptap WYSIWYG Markdown for descriptions and notes, Linked Tickets (`blocks`, `causes`, `duplicates`, `relates_to`, `parent_of`), colored Labels, Multi-Select Bulk Actions, and type-to-confirm Danger Zone modals.
- **Dashboards & Analytics:** Global Admin Dashboard (`/dashboard`) and Per-Project Dashboards (`/projects/[id]/dashboard`) with inflow vs. resolution trends, status/priority distributions, and project health leaderboards.
- **Multi-Platform Git, Trackers & Two-Way Webhooks:** GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Linear, and Jira support plus incoming webhook sync at `/api/webhooks/trackers/[provider]`.
- **Built-In MCP Server & Repo-Aware AI:** Streamable HTTP `/api/mcp` + stdio bridge (`scripts/mcp-server.ts`) and multimodal/repo-aware AI Investigation + Coding Agent Fix Prompt generator.

## Quick Start

1. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
2. **Install dependencies & start PostgreSQL:**
   ```bash
   npm install
   docker compose up -d db
   ```
3. **Run migrations and seed (admin or full demo data):**
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   # Optional rich demo dataset (projects, urgent/blocked tickets, links, labels, saved views):
   npx tsx scripts/seed-demo.ts
   ```
4. **Start dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and sign in at `/login`.

## Verification & Ops

```bash
npm run db:backup   # Export full JSON backup to backups/
npx tsc --noEmit    # TypeScript check
npm run lint        # ESLint
npm test            # Vitest suite
npm run build       # Production Next.js standalone build
```
