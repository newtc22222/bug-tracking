# Bug Tracking Feedback Extension

This is a plain Chrome Manifest V3 extension with no build step. It detects the active tab's hostname, looks up a matching Bug Tracking project, and submits feedback through the public unauthenticated submission API.

## Configure the API origin

The manifest includes `https://your-bug-tracker-domain.com/*` as a placeholder host permission. Replace that placeholder with the actual deployed Bug Tracking origin in `manifest.json` before loading the extension for production use. `http://localhost:3000/*` is included for local development.

After loading the extension, open its **Extension settings** page and set the API origin, for example:

```text
http://localhost:3000
```

The value is stored in `chrome.storage.local`.

## Load locally

Open `chrome://extensions` in Chrome, enable **Developer mode**, select **Load unpacked**, and choose this `extension/` directory. Then set the API origin to the local development server or deployed Bug Tracking origin.

The extension requires a project with a matching live-site domain for automatic detection. If no domain matches, it loads the public project-name/slug fallback list so a project can be selected manually.

Screenshot capture, Firefox/Safari support, Chrome Web Store publishing, and AI assistance are intentionally not included in this phase.
