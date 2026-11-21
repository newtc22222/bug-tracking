const DEFAULT_API_ORIGIN = "https://your-bug-tracker-domain.com";

const state = {
  apiOrigin: DEFAULT_API_ORIGIN,
  tabUrl: "",
  domain: "",
  projectSlug: "",
  screenshotDataUrl: "",
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("feedback-form").addEventListener("submit", submitFeedback);
  document.getElementById("project-select").addEventListener("change", handleProjectSelection);
  document
    .getElementById("capture-screenshot-button")
    .addEventListener("click", captureScreenshot);
  document
    .getElementById("remove-screenshot-button")
    .addEventListener("click", clearScreenshot);
  document.getElementById("options-button").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  initialize().catch((error) => {
    showGlobalError(error.message || "Unable to connect to the feedback service.");
  });
});

async function initialize() {
  const settings = await chrome.storage.local.get({ apiOrigin: DEFAULT_API_ORIGIN });
  state.apiOrigin = normalizeOrigin(settings.apiOrigin);

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  state.tabUrl = activeTab?.url || "";

  if (!state.tabUrl) {
    throw new Error("This tab does not have a usable page URL.");
  }

  try {
    state.domain = new URL(state.tabUrl).hostname;
  } catch {
    throw new Error("This tab does not have a usable website address.");
  }

  const result = await fetchJson(
    `${state.apiOrigin}/api/lookup?domain=${encodeURIComponent(state.domain)}`,
  );

  hide("loading-state");

  if (result.found) {
    state.projectSlug = result.slug;
    showDetectedProject(result.name, state.domain);
    show("feedback-form");
    return;
  }

  show("no-match-state");
  await loadFallbackProjects();
}

async function loadFallbackProjects() {
  const select = document.getElementById("project-select");

  try {
    const projects = await fetchJson(`${state.apiOrigin}/api/projects/public-list`);
    for (const project of projects) {
      const option = document.createElement("option");
      option.value = project.slug;
      option.textContent = project.name;
      select.appendChild(option);
    }
  } catch {
    showGlobalError("Unable to load the project list. Check the extension settings.");
  }
}

function handleProjectSelection(event) {
  state.projectSlug = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex];

  if (!state.projectSlug) {
    hide("feedback-form");
    hide("project-context");
    return;
  }

  showDetectedProject(selectedOption.textContent, "manual selection");
  show("feedback-form");
}

async function submitFeedback(event) {
  event.preventDefault();
  hide("form-error");

  if (!state.projectSlug) {
    showGlobalError("Choose a project before sending feedback.");
    return;
  }

  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = true;

  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    type: document.getElementById("type").value,
    reporterName: document.getElementById("reporter-name").value.trim(),
    reporterEmail: document.getElementById("reporter-email").value.trim(),
    website: document.getElementById("website").value.trim(),
    pageUrl: state.tabUrl,
    browserInfo: navigator.userAgent,
    ...(state.screenshotDataUrl ? { screenshotDataUrl: state.screenshotDataUrl } : {}),
  };

  try {
    const response = await fetch(
      `${state.apiOrigin}/api/submit/${encodeURIComponent(state.projectSlug)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many submissions. Please try again later.");
      }
      throw new Error("The feedback could not be sent.");
    }

    hide("feedback-form");
    hide("no-match-state");
    show("success-state");
  } catch (error) {
    showFormError(error.message || "The feedback could not be sent. Please try again.");
    submitButton.disabled = false;
  }
}

function showDetectedProject(name, context) {
  const contextElement = document.getElementById("project-context");
  contextElement.textContent = `Project: ${name} · ${context}`;
  show("project-context");
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || "The feedback service returned an error.");
  }

  return body;
}

function normalizeOrigin(value) {
  const origin = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_API_ORIGIN;
  return origin.replace(/\/$/, "");
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

function showFormError(message) {
  const error = document.getElementById("form-error");
  error.textContent = message;
  show("form-error");
}

function showGlobalError(message) {
  hide("loading-state");
  const error = document.getElementById("global-error");
  error.textContent = message;
  show("global-error");
}

async function captureScreenshot() {
  hide("form-error");
  const button = document.getElementById("capture-screenshot-button");
  button.disabled = true;

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "jpeg",
      quality: 75,
    });
    if (!dataUrl) {
      throw new Error("Unable to capture tab screenshot.");
    }

    state.screenshotDataUrl = dataUrl;
    document.getElementById("screenshot-preview").src = dataUrl;
    show("screenshot-preview-wrap");
    button.textContent = "Retake screenshot";
  } catch (error) {
    showFormError(error.message || "Unable to capture screenshot on this tab.");
  } finally {
    button.disabled = false;
  }
}

function clearScreenshot() {
  state.screenshotDataUrl = "";
  document.getElementById("screenshot-preview").removeAttribute("src");
  hide("screenshot-preview-wrap");
  document.getElementById("capture-screenshot-button").textContent =
    "Capture visible tab screenshot";
}
