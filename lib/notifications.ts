export type NotificationProject = {
  id: string;
  name: string;
  slug: string;
  webhookUrl?: string | null;
};

export type NotificationFeedback = {
  id?: string;
  title: string;
  description?: string | null;
  type: string;
  status?: string;
  priority?: string | null;
  source: string;
  pageUrl?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
};

export type NotificationResult = {
  sent: boolean;
  skipped?: boolean;
  format?: "slack" | "discord" | "generic";
  error?: string;
};

export async function sendFeedbackNotification(
  project: NotificationProject,
  feedback: NotificationFeedback,
): Promise<NotificationResult> {
  const webhookUrl = project.webhookUrl?.trim();
  if (!webhookUrl) {
    return { sent: false, skipped: true };
  }

  const format = detectWebhookFormat(webhookUrl);
  const body = buildWebhookPayload(format, project, feedback);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        sent: false,
        format,
        error: `Webhook returned HTTP ${response.status}`,
      };
    }

    return { sent: true, format };
  } catch (error) {
    return {
      sent: false,
      format,
      error: error instanceof Error ? error.message : "Webhook delivery failed",
    };
  }
}

export function detectWebhookFormat(url: string): "slack" | "discord" | "generic" {
  const lower = url.toLowerCase();
  if (lower.includes("hooks.slack.com")) {
    return "slack";
  }
  if (
    lower.includes("discord.com/api/webhooks") ||
    lower.includes("discordapp.com/api/webhooks")
  ) {
    return "discord";
  }
  return "generic";
}

function buildWebhookPayload(
  format: "slack" | "discord" | "generic",
  project: NotificationProject,
  feedback: NotificationFeedback,
): Record<string, unknown> {
  const summaryLine = `[${project.name}] New ${feedback.type} (${feedback.source}): ${feedback.title}`;
  const snippet = feedback.description ? feedback.description.slice(0, 400) : "";

  if (format === "slack") {
    const details = [
      feedback.pageUrl ? `Page: ${feedback.pageUrl}` : null,
      feedback.reporterName || feedback.reporterEmail
        ? `Reporter: ${feedback.reporterName || "Unknown"}${feedback.reporterEmail ? ` (${feedback.reporterEmail})` : ""}`
        : null,
      snippet ? `\n${snippet}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      text: summaryLine,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${summaryLine}*${details ? `\n${details}` : ""}`,
          },
        },
      ],
    };
  }

  if (format === "discord") {
    const fields = [
      { name: "Project", value: project.name, inline: true },
      { name: "Type", value: feedback.type, inline: true },
      { name: "Source", value: feedback.source, inline: true },
      ...(feedback.pageUrl ? [{ name: "Page URL", value: feedback.pageUrl, inline: false }] : []),
    ];

    return {
      content: summaryLine,
      embeds: [
        {
          title: feedback.title,
          description: snippet || undefined,
          fields,
        },
      ],
    };
  }

  return {
    event: "feedback.created",
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
    },
    feedback: {
      id: feedback.id ?? null,
      title: feedback.title,
      description: feedback.description ?? null,
      type: feedback.type,
      status: feedback.status ?? "open",
      priority: feedback.priority ?? null,
      source: feedback.source,
      pageUrl: feedback.pageUrl ?? null,
      reporterName: feedback.reporterName ?? null,
      reporterEmail: feedback.reporterEmail ?? null,
    },
  };
}
