# Bug Tracking Feedback Extension (`v0.2.0`)

A zero-build Chrome Manifest V3 extension that detects the active tab's hostname, captures viewport + failed HTTP diagnostics and optional screenshots, and submits bug reports directly to your self-hosted Bug Tracking workspace.

## Features

- **Automatic Project Detection:** Matches the active tab hostname via `GET /api/lookup?domain=...` with fallback selector via `GET /api/projects/public-list`.
- **Diagnostics & Screenshot Capture:** Captures active page URL, browser user agent, viewport resolution + DPR, recent failed HTTP resources (`>= 400`), and optional visible-tab JPEG screenshots.
- **Open Full Page Form ↗:** Spill complex bug reports into a full-page editor — configurable in Extension Settings to open either the public form (`/submit/[slug]`) or the authenticated Admin Markdown Editor (`/projects/by-slug/[slug]/feedback/new`).

## Load Locally

1. Update `host_permissions` in `extension/manifest.json` with your deployed Bug Tracking origin (`http://localhost:3000/*` is already included for local dev).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `extension/`.
3. Open **Extension settings** (`options.html`), set your API origin (e.g., `http://localhost:3000`), and select your preferred full-page form target.
