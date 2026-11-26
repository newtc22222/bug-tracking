# Bug Tracking Wiki (`v0.2.0`)

Welcome to the **Bug Tracking** platform wiki. This workbench combines multi-project Jira/Linear triage power with lightweight, rapid bug capture.

---

## Architecture Overview

- **Framework:** Next.js 16 (App Router, `proxy.ts` auth boundary, TypeScript, Tailwind CSS v4)
- **Database:** PostgreSQL 16 + Prisma 6 (`prisma.config.ts`)
- **Auth:** Auth.js v5 Credentials (JWT sessions) + Project-scoped `btk_*` API/MCP keys
- **Editor:** Tiptap v3 WYSIWYG (`StarterKit` with built-in `link`) ↔ pure GFM Markdown roundtrip (`marked` + native `Document.parseHTML` / `DOMPurify` + `turndown` + `react-markdown`/`rehype-sanitize`)
- **Charts & Drag-and-Drop:** `recharts` + `@dnd-kit/core`
- **Guided Tours:** `driver.js`
- **Browser Extension:** Chrome Manifest V3 (`extension/`) with zero build step

---

## Core Workflows

### 1. Strict 6-State Workflow Machine (`lib/workflow.ts`)
All status transitions are strictly validated across dropdowns, Kanban drag-and-drop, bulk actions, REST API, and MCP tools:

| From Status | Allowed Next Statuses |
| :--- | :--- |
| **Open** | `To Do`, `In Progress`, `Blocked`, `Closed` |
| **To Do** | `In Progress`, `Blocked`, `Open`, `Closed` |
| **In Progress** | `Resolved`, `Blocked`, `To Do` |
| **Blocked** | `In Progress`, `To Do`, `Closed` |
| **Resolved** | `Closed`, `In Progress` |
| **Closed** | `Open` |

### 2. Triage Order & Ticket Keys
- **Triage property order:** `Type → Priority → Status`
- **Priorities:** `Urgent`, `High`, `Medium`, `Low` (plus unset)
- **Ticket Keys:** Every project defines a unique `keyPrefix` (e.g., `WEB`, `PAY`) and auto-increments `sequenceNumber` to generate human-readable keys (`WEB-1`, `WEB-2`, `PAY-42`).

### 3. Ticket Views & Rapid Triage
- **Views:** `Full Scroll List` (default), `Fixed Height List`, `Card Grid` (with screenshot previews), and `Kanban Board`.
- **Surfaces:** Configure **Page / Modal / Drawer** independently in `/settings` for New Project (default: `Page`), New Ticket (default: `Modal`), and Ticket Review (default: `Drawer`).
- **URL-Synced Drawer & Keyboard Stepping:** Opening a ticket updates `?ticket=<id>` in the URL; press `J` (next) / `K` (previous) to triage rapidly without closing the drawer.
- **Bulk Actions:** Multi-select tickets in List/Grid views to update Priority, run workflow-safe Status transitions, attach Labels, or bulk Delete (type-to-confirm modal).
- **Labels & Saved Views:** Create colored global/project labels and pin any filtered view directly to the collapsible left sidebar.

### 4. Ticket Relationships (`FeedbackLink`)
Link any two tickets with canonical directed edges (inverse labels rendered automatically):
- `blocks` ↔ `is blocked by` (offers 1-click "Set status to Blocked")
- `causes` ↔ `is caused by`
- `duplicates` ↔ `is duplicated by` (1-click "Link dup" in AI Triage)
- `parent_of` ↔ `subtask_of`
- `relates_to` ↔ `relates_to`

### 5. Appearance: Dark Mode & Multi-Theme Accents
- **Color Schemes:** `System`, `Light`, `Dark` (zero-FOUC SSR cookie + `<meta name="color-scheme" content="light dark">` + live `prefers-color-scheme` sync).
- **Accent Themes:** `Slate (Linear)`, `Indigo`, `Emerald`, `Amber`, `Rose`.
- **Layout Width:** `Full (100%)` (default), `Wide (1280px)`, `Narrow (1024px)`.

### 6. Danger Zone Safety
Destructive actions (Delete Project, Delete Ticket, Bulk Delete) open a native `<dialog>` confirmation modal with `autofocus` on **Cancel** and require typing the exact project slug, ticket key, or `DELETE` before unlocking deletion.

---

## Integrations & AI

### Multi-Platform Git & Issue Trackers
- **Git Platforms:** GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Custom (auto-detected from Repository URL).
- **External Issue Trackers:** GitHub Issues, GitLab Issues, Linear, Jira Cloud, Bitbucket Issues — promote via API, link existing URLs manually, or sync statuses.
- **Two-Way Webhooks:**
  - `POST /api/webhooks/trackers/github`
  - `POST /api/webhooks/trackers/gitlab`
  - `POST /api/webhooks/trackers/linear`
  - `POST /api/webhooks/trackers/jira`
  - Set `TRACKER_WEBHOOK_SECRET` to validate signatures/tokens.

### Built-In MCP Server (`/api/mcp` & `scripts/mcp-server.ts`)
Authenticate with `Authorization: Bearer btk_<project-api-key>` or an Admin session cookie. Exposed tools:
- `list_projects`, `list_tickets`, `get_ticket`, `create_ticket`, `update_ticket`, `add_ticket_note`, `link_tickets`, `investigate_ticket`.

### Repo-Aware AI Triage & Investigate
- **AI Triage (`POST /api/feedback/ai-triage`):** Cleans raw text, suggests Type & Priority (including `urgent`), and detects duplicates.
- **AI Investigate (`POST /api/feedback/[id]/investigate`):** Inspects ticket context, linked issues, recent notes, attached screenshots (multimodal vision on Gemini/OpenAI), and top-level GitHub repository structure (`GITHUB_TOKEN`) to output ranked root-cause hypotheses, verification checklist, suggested fix, and a copyable Coding Agent Prompt. Works offline in `heuristic` mode with zero API keys.

---

## Release History

- **`v0.2.0` (Workbench Platform):** Collapsible Linear sidebar, 100% configurable layout width, Dark Mode & 5 Accent Themes, Priority `Urgent`, strict 6-state linear workflow diagram, Ticket Keys, Tiptap WYSIWYG Markdown, Kanban/Grid/Fixed/Full views, URL-synced Review Drawer + `J`/`K` stepping, Multi-select Bulk Actions, Labels, Saved Views, Linked Tickets, Global & Project Dashboards, Multi-Platform Git/Trackers + Two-Way Webhooks, Built-in MCP Server, Repo-Aware AI Investigate, Type-to-confirm Danger Zone modal, Chrome Extension v0.2 diagnostics, `driver.js` tours, and Wiki.
- **`v0.1.0` (MVP + Milestones 1–4):** Projects & Feedback CRUD, Public Forms, Auth.js v5, Chrome Extension MVP, AI Triage, GitHub promotion, Notes/Status history, API Keys, DB Rate Limiting, CSV/JSON Export, Backups.
