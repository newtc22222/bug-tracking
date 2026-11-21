const DEFAULT_API_ORIGIN = "https://your-bug-tracker-domain.com";

const form = document.getElementById("settings-form");
const input = document.getElementById("api-origin");
const status = document.getElementById("status");

chrome.storage.local.get({ apiOrigin: DEFAULT_API_ORIGIN }, (settings) => {
  input.value = settings.apiOrigin;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const apiOrigin = normalizeOrigin(input.value);

  if (!apiOrigin) {
    status.textContent = "Enter a valid API origin.";
    return;
  }

  chrome.storage.local.set({ apiOrigin }, () => {
    status.textContent = "Settings saved.";
  });
});

function normalizeOrigin(value) {
  const trimmed = value.trim().replace(/\/$/, "");

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== "/") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}
