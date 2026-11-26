import type { AiProvider } from "@/lib/ai-triage";
import { extractGithubOwnerRepo } from "@/lib/github";

export type AiInvestigateInput = {
  ticketKey?: string | null;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority?: string | null;
  source?: string | null;
  pageUrl?: string | null;
  browserInfo?: string | null;
  screenshotDataUrl?: string | null;
  projectName: string;
  projectSlug: string;
  repoUrl?: string | null;
  gitPlatform?: string | null;
  repoContext?: {
    files: string[];
    readmeExcerpt?: string;
  } | null;
  linkedTickets?: Array<{
    relation: string;
    ticketKey: string | null;
    title: string;
    status: string;
  }>;
  recentNotes?: Array<{
    authorEmail: string;
    body: string;
  }>;
};

export type AiInvestigateResult = {
  rootCauseHypotheses: Array<{
    title: string;
    likelihood: "high" | "medium" | "low";
    explanation: string;
  }>;
  investigationChecklist: string[];
  suggestedSolution: string;
  agentPrompt: string;
  provider: AiProvider;
  fallbackUsed: boolean;
};

export async function fetchRepoContextForInvestigation(
  repoUrl: string | null | undefined,
  gitPlatform?: string | null,
): Promise<{ files: string[]; readmeExcerpt?: string } | null> {
  if (!repoUrl?.trim()) return null;

  const githubToken = process.env.GITHUB_TOKEN?.trim();
  if (githubToken && (gitPlatform === "github" || repoUrl.includes("github.com"))) {
    const ref = extractGithubOwnerRepo(repoUrl);
    if (!ref) return null;
    try {
      const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "bug-tracking-app",
      };
      const [contentsRes, readmeRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/contents`, {
          headers,
          signal: AbortSignal.timeout(4000),
        }),
        fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/readme`, {
          headers,
          signal: AbortSignal.timeout(4000),
        }).catch(() => null),
      ]);

      const files: string[] = [];
      if (contentsRes.ok) {
        const items = (await contentsRes.json().catch(() => [])) as Array<{
          path?: string;
          type?: string;
        }>;
        for (const item of items.slice(0, 40)) {
          if (item.path) files.push(item.type === "dir" ? `${item.path}/` : item.path);
        }
      }

      let readmeExcerpt: string | undefined;
      if (readmeRes?.ok) {
        const rd = (await readmeRes.json().catch(() => null)) as { content?: string } | null;
        if (rd?.content) {
          readmeExcerpt = Buffer.from(rd.content, "base64").toString("utf8").slice(0, 800).trim();
        }
      }

      if (files.length > 0 || readmeExcerpt) {
        return { files, readmeExcerpt };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function investigateTicket(
  input: AiInvestigateInput,
): Promise<AiInvestigateResult> {
  const repoContext =
    input.repoContext !== undefined
      ? input.repoContext
      : await fetchRepoContextForInvestigation(input.repoUrl, input.gitPlatform);
  const enrichedInput: AiInvestigateInput = { ...input, repoContext };

  const provider = resolveProvider();

  if (provider === "openai") {
    try {
      return await investigateWithOpenAi(enrichedInput);
    } catch {
      return { ...investigateWithHeuristics(enrichedInput), fallbackUsed: true };
    }
  }

  if (provider === "gemini") {
    try {
      return await investigateWithGemini(enrichedInput);
    } catch {
      return { ...investigateWithHeuristics(enrichedInput), fallbackUsed: true };
    }
  }

  return investigateWithHeuristics(enrichedInput);
}

export function buildAgentFixPrompt(input: AiInvestigateInput): string {
  const keyLabel = input.ticketKey ? `[${input.ticketKey}] ` : "";
  const lines: string[] = [
    `# Investigate & Fix ${keyLabel}${input.title}`,
    "",
    "## Ticket Context",
    `- **Project:** ${input.projectName} (\`/${input.projectSlug}\`)`,
    `- **Type:** ${input.type}`,
    `- **Priority:** ${input.priority || "Unset"}`,
    `- **Current Status:** ${input.status}`,
  ];

  if (input.repoUrl) {
    lines.push(`- **Repository:** ${input.repoUrl}`);
  }
  if (input.repoContext && input.repoContext.files.length > 0) {
    lines.push(
      `- **Top-Level Repo Files:** ${input.repoContext.files.slice(0, 20).map((f) => `\`${f}\``).join(", ")}`,
    );
  }
  if (input.pageUrl) {
    lines.push(`- **Page URL:** ${input.pageUrl}`);
  }
  if (input.browserInfo) {
    lines.push(`- **Browser / Environment:** ${input.browserInfo}`);
  }
  if (input.screenshotDataUrl) {
    lines.push("- **Screenshot:** Attached in ticket (inspect visual evidence if available)");
  }

  lines.push("", "## Reported Description", input.description?.trim() || "(No description provided)");

  if (input.linkedTickets && input.linkedTickets.length > 0) {
    lines.push("", "## Related Tickets");
    for (const link of input.linkedTickets) {
      lines.push(
        `- **${link.relation}** ${link.ticketKey ? `[${link.ticketKey}] ` : ""}${link.title} (${link.status})`,
      );
    }
  }

  if (input.recentNotes && input.recentNotes.length > 0) {
    lines.push("", "## Internal Triage Notes");
    for (const note of input.recentNotes.slice(0, 5)) {
      lines.push(`- **${note.authorEmail}:** ${note.body.replace(/\s+/g, " ").trim()}`);
    }
  }

  lines.push(
    "",
    "## Instructions",
    "1. Locate the relevant files and root cause in the codebase for the symptoms described above.",
    "2. Explain the root cause clearly before editing code.",
    "3. Implement a minimal, well-tested fix that preserves existing behavior and edge cases.",
    "4. Add or update unit/integration tests covering this regression, then run typecheck, lint, tests, and build.",
  );

  return lines.join("\n");
}

export function investigateWithHeuristics(input: AiInvestigateInput): AiInvestigateResult {
  const text = `${input.title}\n${input.description || ""}\n${input.pageUrl || ""}`.toLowerCase();
  const hypotheses: AiInvestigateResult["rootCauseHypotheses"] = [];
  const checklist: string[] = [];

  if (/(500|timeout|network|api|fetch|cors|401|403|404|server|database|prisma)/.test(text)) {
    hypotheses.push({
      title: "API / Backend Contract or Error-Handling Failure",
      likelihood: "high",
      explanation:
        "Error symptoms point toward a failed HTTP request, unhandled backend exception, auth/permission mismatch, or query edge case.",
    });
    checklist.push(
      "Inspect server logs and API response payloads for the failing route.",
      "Verify authentication/authorization checks and input validation on the endpoint.",
    );
  }

  if (/(layout|css|scroll|modal|drawer|button|click|mobile|responsive|overlap|style|render|hydration)/.test(text)) {
    hypotheses.push({
      title: "UI Layout, Event Handler, or Hydration Mismatch",
      likelihood: "high",
      explanation:
        "Reported symptoms indicate a client-side rendering, responsive CSS, focus/z-index, or event propagation issue.",
    });
    checklist.push(
      "Reproduce at desktop and mobile viewports using browser DevTools.",
      "Check console warnings for React hydration mismatches or swallowed click events.",
    );
  }

  if (/(state|stale|cache|refresh|duplicate|race|save|form|submit|validation)/.test(text)) {
    hypotheses.push({
      title: "Client State Desync or Validation Edge Case",
      likelihood: "medium",
      explanation:
        "Form submission, optimistic updates, or cache invalidation may be out of sync with the persisted backend state.",
    });
    checklist.push(
      "Trace form submission payload and verify router/cache invalidation after mutation.",
      "Test rapid double-submit and empty/null boundary inputs.",
    );
  }

  if (hypotheses.length === 0) {
    hypotheses.push({
      title: "Primary Component / Workflow Logic Defect",
      likelihood: "medium",
      explanation: `Review the code path handling "${input.title}"${input.pageUrl ? ` around ${input.pageUrl}` : ""} for missing guards or unexpected inputs.`,
    });
  }

  if (input.pageUrl) {
    checklist.unshift(`Open ${input.pageUrl} and verify exact reproduction steps.`);
  }
  if (input.linkedTickets && input.linkedTickets.length > 0) {
    checklist.push("Review linked blocking/related tickets to avoid conflicting fixes.");
  }
  checklist.push("Add a regression test covering the exact failure scenario before marking Resolved.");

  const suggestedSolution = [
    `### Recommended Approach for ${input.ticketKey || input.title}`,
    "",
    `1. **Reproduce & isolate** the ${input.type} using the captured environment context${input.pageUrl ? ` (\`${input.pageUrl}\`)` : ""}.`,
    `2. **Validate the top hypothesis**: ${hypotheses[0].title} — ${hypotheses[0].explanation}`,
    "3. **Patch & verify**: Apply a scoped fix, confirm no regressions in adjacent flows, and add a targeted automated test.",
  ].join("\n");

  return {
    rootCauseHypotheses: hypotheses,
    investigationChecklist: checklist,
    suggestedSolution,
    agentPrompt: buildAgentFixPrompt(input),
    provider: "heuristic",
    fallbackUsed: false,
  };
}

function resolveProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "heuristic") return "heuristic";
  if (explicit === "openai") return process.env.OPENAI_API_KEY?.trim() ? "openai" : "heuristic";
  if (explicit === "gemini") return process.env.GEMINI_API_KEY?.trim() ? "gemini" : "heuristic";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  return "heuristic";
}

async function investigateWithOpenAi(input: AiInvestigateInput): Promise<AiInvestigateResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const textPayload = JSON.stringify({
    ticketKey: input.ticketKey,
    projectName: input.projectName,
    repoUrl: input.repoUrl,
    type: input.type,
    priority: input.priority,
    status: input.status,
    title: input.title,
    description: input.description,
    pageUrl: input.pageUrl,
    browserInfo: input.browserInfo,
    linkedTickets: input.linkedTickets,
    recentNotes: input.recentNotes,
  });

  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: textPayload }];
  if (input.screenshotDataUrl?.startsWith("data:image/")) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.screenshotDataUrl },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a senior staff engineer investigating a bug/feature ticket. Return strict JSON with keys: rootCauseHypotheses (array of {title, likelihood: "high"|"medium"|"low", explanation}), investigationChecklist (array of concise action strings), suggestedSolution (markdown string), agentPrompt (ready-to-paste markdown prompt for an AI coding agent to investigate and fix this ticket).',
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI response");
  return normalizeInvestigationResponse(raw, input, "openai");
}

async function investigateWithGemini(input: AiInvestigateInput): Promise<AiInvestigateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const parts: Array<Record<string, unknown>> = [
    {
      text: `You are a senior staff engineer investigating a software ticket. Return JSON with keys: rootCauseHypotheses (array of {title, likelihood: "high"|"medium"|"low", explanation}), investigationChecklist (array of concise strings), suggestedSolution (markdown string), agentPrompt (ready-to-paste markdown prompt for an AI coding agent).\n\nTicket:\n${JSON.stringify({
        ticketKey: input.ticketKey,
        projectName: input.projectName,
        repoUrl: input.repoUrl,
        type: input.type,
        priority: input.priority,
        status: input.status,
        title: input.title,
        description: input.description,
        pageUrl: input.pageUrl,
        browserInfo: input.browserInfo,
        linkedTickets: input.linkedTickets,
        recentNotes: input.recentNotes,
      })}`,
    },
  ];

  const shotMatch = input.screenshotDataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (shotMatch) {
    parts.push({
      inlineData: {
        mimeType: shotMatch[1],
        data: shotMatch[2],
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        contents: [{ role: "user", parts }],
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Empty Gemini response");
  return normalizeInvestigationResponse(raw, input, "gemini");
}

function normalizeInvestigationResponse(
  rawJson: string,
  input: AiInvestigateInput,
  provider: AiProvider,
): AiInvestigateResult {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const fallback = investigateWithHeuristics(input);

  const hypotheses = Array.isArray(parsed.rootCauseHypotheses)
    ? parsed.rootCauseHypotheses
        .filter((h): h is Record<string, unknown> => Boolean(h && typeof h === "object"))
        .map((h): AiInvestigateResult["rootCauseHypotheses"][number] => ({
          title: typeof h.title === "string" && h.title.trim() ? h.title.trim() : "Potential Root Cause",
          likelihood:
            h.likelihood === "high" || h.likelihood === "medium" || h.likelihood === "low"
              ? h.likelihood
              : "medium",
          explanation:
            typeof h.explanation === "string" && h.explanation.trim() ? h.explanation.trim() : "",
        }))
        .filter((h) => h.explanation)
    : [];

  const checklist = Array.isArray(parsed.investigationChecklist)
    ? parsed.investigationChecklist
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((s) => s.trim())
    : [];

  return {
    rootCauseHypotheses: hypotheses.length > 0 ? hypotheses : fallback.rootCauseHypotheses,
    investigationChecklist: checklist.length > 0 ? checklist : fallback.investigationChecklist,
    suggestedSolution:
      typeof parsed.suggestedSolution === "string" && parsed.suggestedSolution.trim()
        ? parsed.suggestedSolution.trim()
        : fallback.suggestedSolution,
    agentPrompt:
      typeof parsed.agentPrompt === "string" && parsed.agentPrompt.trim()
        ? parsed.agentPrompt.trim()
        : fallback.agentPrompt,
    provider,
    fallbackUsed: false,
  };
}
