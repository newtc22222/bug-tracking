const DEFAULT_API_ORIGIN = "https://your-bug-tracker-domain.com";

const form = document.getElementById("settings-form");
const input = document.getElementById("api-origin");
const fullPageSelect = document.getElementById("full-page-target");
const status = document.getElementById("status");

chrome.storage.local.get(
  { apiOrigin: DEFAULT_API_ORIGIN, fullPageTarget: "public" },
  (settings) => {
    input.value = settings.apiOrigin;
    if (fullPageSelect) {
      fullPageSelect.value = settings.fullPageTarget || "public";
    }
  },
);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const apiOrigin = normalizeOrigin(input.value);

  if (!apiOrigin) {
    status.textContent = "Enter a valid API origin.";
    return;
  }

  const fullPageTarget = fullPageSelect ? fullPageSelect.value : "public";
  chrome.storage.local.set({ apiOrigin, fullPageTarget }, () => {
    status.textContent = "Settings saved.";
  });
});

function normalizeOrigin(value) {
  const trimmed = value.trim().replace(/\/$/, "");

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}
