import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { priorityOptions, typeOptions } from "@/lib/feedback-display";

export type AiProvider = "openai" | "gemini" | "heuristic";

export type AiAnalysisInput = {
  title: string;
  description?: string | null;
  currentType?: string | null;
  currentPriority?: string | null;
};

export type AiAnalysisResult = {
  cleanedTitle: string;
  structuredDescription: string;
  suggestedType: FeedbackType;
  suggestedPriority: FeedbackPriority;
  summary: string;
  reasoning: string;
  provider: AiProvider;
  fallbackUsed: boolean;
};

export type DuplicateCandidateInput = {
  id: string;
  title: string;
  description: string | null;
  status: FeedbackStatus;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  createdAt: Date | string;
};

export type DuplicateCandidate = {
  id: string;
  title: string;
  status: FeedbackStatus;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  similarity: number;
  createdAt: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "into",
  "have",
  "when",
  "what",
  "where",
  "your",
  "page",
  "not",
  "are",
  "was",
  "can",
  "does",
  "its",
  "you",
  "but",
  "all",
  "any",
  "out",
  "use",
]);

const EXTENSION_MARKER = "---\nSubmitted via extension";

export async function analyzeFeedbackText(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  const provider = resolveProvider();

  if (provider === "openai") {
    try {
      return await analyzeWithOpenAi(input);
    } catch {
      return { ...analyzeWithHeuristics(input), fallbackUsed: true };
    }
  }

  if (provider === "gemini") {
    try {
      return await analyzeWithGemini(input);
    } catch {
      return { ...analyzeWithHeuristics(input), fallbackUsed: true };
    }
  }

  return analyzeWithHeuristics(input);
}

export function analyzeWithHeuristics(input: AiAnalysisInput): AiAnalysisResult {
  const cleanedTitle = cleanTitle(input.title);
  const { body, extensionBlock } = splitExtensionContext(input.description || "");
  const { suggestedType, typeReason } = inferFeedbackType(
    cleanedTitle,
    body,
    input.currentType,
  );
  const { suggestedPriority, priorityReason } = inferFeedbackPriority(
    cleanedTitle,
    body,
    suggestedType,
  );

  const structuredBody = formatStructuredBody(cleanedTitle, body, suggestedType);
  const structuredDescription = extensionBlock
    ? [structuredBody, extensionBlock].filter(Boolean).join("\n\n")
    : structuredBody;

  const summary = body
    ? `${capitalizeFirst(suggestedType)} report: ${cleanedTitle}`
    : cleanedTitle;

  return {
    cleanedTitle,
    structuredDescription,
    suggestedType,
    suggestedPriority,
    summary,
    reasoning: `${typeReason} ${priorityReason}`,
    provider: "heuristic",
    fallbackUsed: false,
  };
}

export function findDuplicateCandidates({
  title,
  description,
  candidates,
  excludeId,
  threshold = 0.25,
  limit = 5,
}: {
  title: string;
  description?: string | null;
  candidates: DuplicateCandidateInput[];
  excludeId?: string;
  threshold?: number;
  limit?: number;
}): DuplicateCandidate[] {
  const { body: targetBody } = splitExtensionContext(description || "");
  const targetTitleTokens = tokenize(title);
  const targetFullTokens = tokenize(`${title} ${targetBody}`);
  const normalizedTargetTitle = normalizeTitleForComparison(title);

  if (targetTitleTokens.size === 0 && targetFullTokens.size === 0) {
    return [];
  }

  const scored: DuplicateCandidate[] = [];

  for (const candidate of candidates) {
    if (excludeId && candidate.id === excludeId) {
      continue;
    }

    const { body: candidateBody } = splitExtensionContext(candidate.description || "");
    const candidateTitleTokens = tokenize(candidate.title);
    const candidateFullTokens = tokenize(`${candidate.title} ${candidateBody}`);

    const titleSimilarity = jaccardSimilarity(targetTitleTokens, candidateTitleTokens);
    const fullSimilarity = jaccardSimilarity(targetFullTokens, candidateFullTokens);
    const normalizedCandidateTitle = normalizeTitleForComparison(candidate.title);

    let score = titleSimilarity * 0.65 + fullSimilarity * 0.35;

    if (
      normalizedTargetTitle.length >= 6 &&
      normalizedCandidateTitle.length >= 6 &&
      (normalizedCandidateTitle.includes(normalizedTargetTitle) ||
        normalizedTargetTitle.includes(normalizedCandidateTitle))
    ) {
      score = Math.min(1, score + 0.15);
    }

    const similarity = Math.round(score * 100) / 100;
    if (similarity < threshold) {
      continue;
    }

    scored.push({
      id: candidate.id,
      title: candidate.title,
      status: candidate.status,
      type: candidate.type,
      priority: candidate.priority,
      similarity,
      createdAt:
        candidate.createdAt instanceof Date
          ? candidate.createdAt.toISOString()
          : String(candidate.createdAt),
    });
  }

  return scored
    .sort((a, b) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}

function resolveProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (explicit === "heuristic") {
    return "heuristic";
  }
  if (explicit === "openai") {
    return process.env.OPENAI_API_KEY?.trim() ? "openai" : "heuristic";
  }
  if (explicit === "gemini") {
    return process.env.GEMINI_API_KEY?.trim() ? "gemini" : "heuristic";
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }

  return "heuristic";
}

async function analyzeWithOpenAi(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const { body, extensionBlock } = splitExtensionContext(input.description || "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You triage internal product feedback. Return JSON with keys: cleanedTitle (string <=200 chars), structuredDescription (markdown string), suggestedType (one of: bug, improvement, feature, question), suggestedPriority (one of: low, medium, high, urgent), summary (1 concise sentence), reasoning (1 concise sentence).",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            description: body,
            currentType: input.currentType || null,
            currentPriority: input.currentPriority || null,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Empty OpenAI response");
  }

  return normalizeExternalAiResponse(rawContent, input, extensionBlock, "openai");
}

async function analyzeWithGemini(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const { body, extensionBlock } = splitExtensionContext(input.description || "");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You triage internal product feedback. Return JSON with keys: cleanedTitle (string <=200 chars), structuredDescription (string), suggestedType (one of: bug, improvement, feature, question), suggestedPriority (one of: low, medium, high, urgent), summary (1 sentence), reasoning (1 sentence).\n\nInput:\n${JSON.stringify({ title: input.title, description: body, currentType: input.currentType || null, currentPriority: input.currentPriority || null })}`,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new Error("Empty Gemini response");
  }

  return normalizeExternalAiResponse(rawContent, input, extensionBlock, "gemini");
}

function normalizeExternalAiResponse(
  rawJson: string,
  fallbackInput: AiAnalysisInput,
  extensionBlock: string,
  provider: AiProvider,
): AiAnalysisResult {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const heuristic = analyzeWithHeuristics(fallbackInput);

  const cleanedTitle =
    typeof parsed.cleanedTitle === "string" && parsed.cleanedTitle.trim()
      ? cleanTitle(parsed.cleanedTitle)
      : heuristic.cleanedTitle;

  const rawStructured =
    typeof parsed.structuredDescription === "string" && parsed.structuredDescription.trim()
      ? parsed.structuredDescription.trim()
      : heuristic.structuredDescription;

  const structuredDescription = extensionBlock && !rawStructured.includes(EXTENSION_MARKER)
    ? `${rawStructured}\n\n${extensionBlock}`
    : rawStructured;

  const suggestedType =
    typeof parsed.suggestedType === "string" &&
    typeOptions.includes(parsed.suggestedType as FeedbackType)
      ? (parsed.suggestedType as FeedbackType)
      : heuristic.suggestedType;

  const suggestedPriority =
    typeof parsed.suggestedPriority === "string" &&
    priorityOptions.includes(parsed.suggestedPriority as FeedbackPriority)
      ? (parsed.suggestedPriority as FeedbackPriority)
      : heuristic.suggestedPriority;

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : heuristic.summary;

  const reasoning =
    typeof parsed.reasoning === "string" && parsed.reasoning.trim()
      ? parsed.reasoning.trim()
      : heuristic.reasoning;

  return {
    cleanedTitle,
    structuredDescription,
    suggestedType,
    suggestedPriority,
    summary,
    reasoning,
    provider,
    fallbackUsed: false,
  };
}

function cleanTitle(rawTitle: string): string {
  const normalized = rawTitle.trim().replace(/\s+/g, " ").slice(0, 200);
  return capitalizeFirst(normalized);
}

function capitalizeFirst(value: string): string {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function splitExtensionContext(description: string): {
  body: string;
  extensionBlock: string;
} {
  const trimmed = description.trim();
  if (!trimmed) {
    return { body: "", extensionBlock: "" };
  }

  const markerIndex = trimmed.indexOf(EXTENSION_MARKER);
  if (markerIndex === -1) {
    return { body: trimmed, extensionBlock: "" };
  }

  const body = trimmed.slice(0, markerIndex).trim();
  const extensionBlock = trimmed.slice(markerIndex).trim();
  return { body, extensionBlock };
}

function formatStructuredBody(title: string, body: string, type: FeedbackType): string {
  if (!body) {
    return `Summary: ${title}`;
  }

  const cleaned = body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.includes("## ") || cleaned.startsWith("Summary:")) {
    return cleaned;
  }

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [`Summary: ${title}`, "", "Details:", cleaned].join("\n");
  }

  const sectionTitle = type === "bug" ? "Observed details:" : "Details:";
  const bullets = lines.map((line) => (line.startsWith("-") ? line : `- ${line}`)).join("\n");
  return [`Summary: ${title}`, "", sectionTitle, bullets].join("\n");
}

function inferFeedbackType(
  title: string,
  body: string,
  currentType?: string | null,
): { suggestedType: FeedbackType; typeReason: string } {
  const text = `${title}\n${body}`.toLowerCase();

  const bugMatches = countKeywordMatches(text, [
    "bug",
    "error",
    "crash",
    "exception",
    "broken",
    "fail",
    "500",
    "404",
    "doesn't work",
    "does not work",
    "not working",
    "cannot",
    "can't",
    "unable to",
    "freeze",
    "stuck",
  ]);

  const questionMatches =
    countKeywordMatches(text, [
      "how to",
      "how do",
      "why does",
      "is there",
      "can i",
      "where can",
      "question",
      "clarify",
      "documentation",
    ]) + (title.trim().endsWith("?") ? 1 : 0);

  const featureMatches = countKeywordMatches(text, [
    "feature",
    "add support",
    "new feature",
    "please add",
    "would love",
    "ability to",
    "allow users",
    "integrate",
    "request",
  ]);

  const improvementMatches = countKeywordMatches(text, [
    "improve",
    "enhancement",
    "better",
    "confusing",
    "polish",
    "slow",
    "refactor",
    "ux",
    "ui",
    "layout",
    "spacing",
  ]);

  if (bugMatches > 0 && bugMatches >= featureMatches && bugMatches >= questionMatches) {
    return {
      suggestedType: "bug",
      typeReason: "Detected failure/error symptoms suggesting a bug.",
    };
  }

  if (questionMatches > 0 && questionMatches >= featureMatches && questionMatches >= improvementMatches) {
    return {
      suggestedType: "question",
      typeReason: "Detected question phrasing.",
    };
  }

  if (featureMatches > 0 && featureMatches >= improvementMatches) {
    return {
      suggestedType: "feature",
      typeReason: "Detected new-capability phrasing suggesting a feature request.",
    };
  }

  if (improvementMatches > 0) {
    return {
      suggestedType: "improvement",
      typeReason: "Detected enhancement/usability wording suggesting an improvement.",
    };
  }

  const fallbackType =
    currentType && typeOptions.includes(currentType as FeedbackType)
      ? (currentType as FeedbackType)
      : "bug";

  return {
    suggestedType: fallbackType,
    typeReason: `Retained ${fallbackType} type as baseline classification.`,
  };
}

function inferFeedbackPriority(
  title: string,
  body: string,
  type: FeedbackType,
): { suggestedPriority: FeedbackPriority; priorityReason: string } {
  const text = `${title}\n${body}`.toLowerCase();

  if (
    countKeywordMatches(text, [
      "data loss",
      "security",
      "vulnerability",
      "outage",
      "production down",
      "urgent",
      "critical",
      "sev1",
      "p0",
    ]) > 0
  ) {
    return {
      suggestedPriority: "urgent",
      priorityReason: "Critical/outage/security keywords indicate urgent priority.",
    };
  }

  if (
    countKeywordMatches(text, [
      "crash",
      "500",
      "blocker",
      "cannot login",
      "can't login",
      "payment",
      "unusable",
    ]) > 0
  ) {
    return {
      suggestedPriority: "high",
      priorityReason: "Blocking/severe failure keywords indicate high priority.",
    };
  }

  if (
    countKeywordMatches(text, [
      "typo",
      "minor",
      "cosmetic",
      "nit",
      "nice to have",
      "spacing",
      "someday",
    ]) > 0 ||
    type === "question"
  ) {
    return {
      suggestedPriority: "low",
      priorityReason:
        type === "question"
          ? "Questions without urgency default to low priority."
          : "Minor/cosmetic wording suggests low priority.",
    };
  }

  return {
    suggestedPriority: "medium",
    priorityReason: "Standard impact defaults to medium priority.",
  };
}

function countKeywordMatches(text: string, keywords: string[]): number {
  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches += 1;
    }
  }
  return matches;
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  return new Set(tokens);
}

function normalizeTitleForComparison(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
