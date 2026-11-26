import bcrypt from "bcryptjs";
import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import { hashApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";

function daysAgo(days: number, hoursOffset = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hoursOffset * 60 * 60 * 1000);
}

const DEMO_SCREENSHOT_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="0" y="0" width="960" height="52" fill="#ffffff" stroke="#e2e8f0"/>
  <circle cx="28" cy="26" r="6" fill="#ef4444"/>
  <circle cx="48" cy="26" r="6" fill="#f59e0b"/>
  <circle cx="68" cy="26" r="6" fill="#10b981"/>
  <rect x="120" y="14" width="320" height="24" rx="6" fill="#f1f5f9"/>
  <text x="136" y="30" font-family="monospace" font-size="12" fill="#475569">https://app.acme-demo.test/billing/invoices</text>
  <rect x="64" y="88" width="832" height="396" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="96" y="134" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">Billing &amp; Invoices</text>
  <rect x="96" y="162" width="768" height="48" rx="8" fill="#fef2f2" stroke="#fecaca"/>
  <text x="116" y="191" font-family="sans-serif" font-size="14" font-weight="bold" fill="#b91c1c">Error 500: Failed to export CSV when date range exceeds 90 days</text>
  <rect x="96" y="232" width="240" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="360" y="232" width="240" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="624" y="232" width="240" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="720" y="384" width="144" height="38" rx="6" fill="#0f172a"/>
  <text x="752" y="408" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">Export CSV</text>
</svg>`,
  "utf8",
).toString("base64");

const DEMO_SCREENSHOT_DATA_URL = `data:image/svg+xml;base64,${DEMO_SCREENSHOT_SVG}`;

type DemoProjectSeed = {
  slug: string;
  name: string;
  domain: string | null;
  repoUrl: string | null;
  webhookUrl: string | null;
  description: string;
};

type DemoFeedbackSeed = {
  projectSlug: string;
  title: string;
  description: string;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  source: FeedbackSource;
  reporterName: string | null;
  reporterEmail: string | null;
  pageUrl?: string;
  browserInfo?: string;
  screenshotDataUrl?: string;
  githubIssueUrl?: string;
  githubIssueNumber?: number;
  createdAt: Date;
  notes?: { authorEmail: string; body: string; createdAt: Date }[];
  statusEvents?: {
    fromStatus: FeedbackStatus | null;
    toStatus: FeedbackStatus;
    actorEmail: string;
    createdAt: Date;
  }[];
};

const demoProjects: DemoProjectSeed[] = [
  {
    slug: "acme-web",
    name: "Acme Web App",
    domain: "app.acme-demo.test",
    repoUrl: "https://github.com/acme-demo/acme-web",
    webhookUrl: "https://webhook.acme-demo.test/bug-tracking",
    description:
      "Customer-facing Next.js dashboard for billing, team permissions, and analytics exports.",
  },
  {
    slug: "checkout-api",
    name: "Checkout API",
    domain: "api.acme-demo.test",
    repoUrl: "https://github.com/acme-demo/checkout-api",
    webhookUrl: null,
    description:
      "Payment intents, webhook verification, and idempotency service backing Acme storefronts.",
  },
  {
    slug: "mobile-companion",
    name: "Mobile Companion",
    domain: null,
    repoUrl: "https://github.com/acme-demo/mobile-companion",
    webhookUrl: null,
    description:
      "iOS and Android companion app for push alerts, offline triage, and QR session pairing.",
  },
  {
    slug: "dev-docs",
    name: "Developer Docs",
    domain: "docs.acme-demo.test",
    repoUrl: "https://github.com/acme-demo/dev-docs",
    webhookUrl: null,
    description:
      "Public API reference, SDK quickstarts, and webhook payload examples.",
  },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@bugtrack.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "password123";

  const passwordHash = await bcrypt.hash(password, 12);
  const adminUser = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  const projectMap = new Map<string, { id: string; slug: string; name: string }>();

  for (const proj of demoProjects) {
    const saved = await prisma.project.upsert({
      where: { slug: proj.slug },
      update: {
        name: proj.name,
        domain: proj.domain,
        repoUrl: proj.repoUrl,
        webhookUrl: proj.webhookUrl,
        description: proj.description,
      },
      create: {
        name: proj.name,
        slug: proj.slug,
        domain: proj.domain,
        repoUrl: proj.repoUrl,
        webhookUrl: proj.webhookUrl,
        description: proj.description,
      },
      select: { id: true, slug: true, name: true },
    });
    projectMap.set(saved.slug, saved);
  }

  const demoProjectIds = Array.from(projectMap.values()).map((p) => p.id);

  // Clean existing demo project items & API keys so re-running is idempotent
  await prisma.feedbackItem.deleteMany({
    where: { projectId: { in: demoProjectIds } },
  });
  await prisma.projectApiKey.deleteMany({
    where: { projectId: { in: demoProjectIds } },
  });

  const demoFeedback: DemoFeedbackSeed[] = [
    {
      projectSlug: "acme-web",
      title: "CSV invoice export returns HTTP 500 for ranges over 90 days",
      description:
        "Steps to reproduce:\n1. Open Billing > Invoices.\n2. Select a custom range spanning Q1–Q2 (> 90 days).\n3. Click Export CSV.\n\nExpected: Background download starts.\nActual: Banner shows Error 500 and network call fails with statement timeout.",
      type: "bug",
      status: "open",
      priority: "high",
      source: "extension",
      reporterName: "Maya Lin",
      reporterEmail: "maya.lin@northstar.io",
      pageUrl: "https://app.acme-demo.test/billing/invoices",
      browserInfo: "Chrome 134.0 / Windows 11 (1440x900)",
      screenshotDataUrl: DEMO_SCREENSHOT_DATA_URL,
      createdAt: daysAgo(1, 3),
      notes: [
        {
          authorEmail: adminUser.email,
          body: "Reproduced locally against replica. The export query lacks a composite index on (workspace_id, issued_at).",
          createdAt: daysAgo(0, 18),
        },
        {
          authorEmail: adminUser.email,
          body: "Assigned to billing sprint; planning to stream rows in chunks of 1,000.",
          createdAt: daysAgo(0, 6),
        },
      ],
      statusEvents: [
        {
          fromStatus: null,
          toStatus: "open",
          actorEmail: adminUser.email,
          createdAt: daysAgo(1, 3),
        },
      ],
    },
    {
      projectSlug: "acme-web",
      title: "Billing invoice CSV export fails when selecting more than 90 days",
      description:
        "Whenever our finance team exports last quarter's invoices as CSV, the page throws an unexpected 500 error.",
      type: "bug",
      status: "open",
      priority: "medium",
      source: "public_form",
      reporterName: "David Okafor",
      reporterEmail: "finance@brightleaf.co",
      createdAt: daysAgo(0, 14),
    },
    {
      projectSlug: "acme-web",
      title: "Keyboard shortcut cmd+k to switch workspaces",
      description:
        "Teams managing 5+ workspaces would save lots of clicks with a quick command palette switcher.",
      type: "feature",
      status: "in_progress",
      priority: "medium",
      source: "public_form",
      reporterName: "Elena Rostova",
      reporterEmail: "elena@studiokite.dev",
      githubIssueUrl: "https://github.com/acme-demo/acme-web/issues/418",
      githubIssueNumber: 418,
      createdAt: daysAgo(5, 2),
      notes: [
        {
          authorEmail: adminUser.email,
          body: "Promoted to GitHub #418 and started prototype in branch feat/cmd-palette.",
          createdAt: daysAgo(3, 5),
        },
      ],
      statusEvents: [
        {
          fromStatus: "open",
          toStatus: "in_progress",
          actorEmail: adminUser.email,
          createdAt: daysAgo(4, 1),
        },
      ],
    },
    {
      projectSlug: "acme-web",
      title: "Clarify SAML SSO role mapping behavior for invited guests",
      description:
        "If a user is invited as Viewer before IdP login, does SAML group sync overwrite their role on first sign-in?",
      type: "question",
      status: "resolved",
      priority: "low",
      source: "public_form",
      reporterName: "Samir Patel",
      reporterEmail: "samir@vergeops.com",
      createdAt: daysAgo(8, 4),
      statusEvents: [
        {
          fromStatus: "open",
          toStatus: "in_progress",
          actorEmail: adminUser.email,
          createdAt: daysAgo(7, 10),
        },
        {
          fromStatus: "in_progress",
          toStatus: "resolved",
          actorEmail: adminUser.email,
          createdAt: daysAgo(6, 2),
        },
      ],
    },
    {
      projectSlug: "acme-web",
      title: "Table header alignment shifts slightly on 1280px viewports",
      description:
        "Minor visual polish: numeric columns in Usage Overview sit 2px left of their cell values.",
      type: "improvement",
      status: "closed",
      priority: null,
      source: "manual",
      reporterName: null,
      reporterEmail: null,
      createdAt: daysAgo(13, 1),
      statusEvents: [
        {
          fromStatus: "open",
          toStatus: "closed",
          actorEmail: adminUser.email,
          createdAt: daysAgo(11, 5),
        },
      ],
    },
    {
      projectSlug: "checkout-api",
      title: "Webhook signature verification fails on UTF-8 customer names",
      description:
        "Payloads containing accented characters fail HMAC-SHA256 verification when body parser normalizes whitespace before signature check.",
      type: "bug",
      status: "open",
      priority: "high",
      source: "api",
      reporterName: "CI Alert Bot",
      reporterEmail: "ci-alerts@acme-demo.test",
      pageUrl: "https://api.acme-demo.test/v2/webhooks/stripe",
      createdAt: daysAgo(0, 9),
      notes: [
        {
          authorEmail: adminUser.email,
          body: "Raw Buffer must be passed into crypto.createHmac instead of JSON.stringify(req.body).",
          createdAt: daysAgo(0, 4),
        },
      ],
    },
    {
      projectSlug: "checkout-api",
      title: "Return Retry-After header on 429 rate-limit responses",
      description:
        "SDK clients automatically back off when Retry-After is present in seconds.",
      type: "improvement",
      status: "in_progress",
      priority: "medium",
      source: "api",
      reporterName: "Jonas Lindqvist",
      reporterEmail: "jonas@nordicpay.se",
      githubIssueUrl: "https://github.com/acme-demo/checkout-api/issues/109",
      githubIssueNumber: 109,
      createdAt: daysAgo(4, 6),
      statusEvents: [
        {
          fromStatus: "open",
          toStatus: "in_progress",
          actorEmail: adminUser.email,
          createdAt: daysAgo(2, 8),
        },
      ],
    },
    {
      projectSlug: "checkout-api",
      title: "Support idempotency keys up to 128 characters",
      description:
        "Our order orchestration generates UUIDv7 + tenant prefix which exceeds the current 64-char limit.",
      type: "feature",
      status: "open",
      priority: "low",
      source: "public_form",
      reporterName: "Claire Moreau",
      reporterEmail: "claire@atelier-cloud.fr",
      createdAt: daysAgo(6, 0),
    },
    {
      projectSlug: "checkout-api",
      title: "Sandbox test card declined with unexpected processing_error",
      description:
        "Using test card 4242...4242 in EUR currency intermittently returned processing_error yesterday.",
      type: "bug",
      status: "resolved",
      priority: "medium",
      source: "public_form",
      reporterName: "Kenji Takahashi",
      reporterEmail: "kenji@kumo.jp",
      createdAt: daysAgo(10, 3),
      statusEvents: [
        {
          fromStatus: "open",
          toStatus: "resolved",
          actorEmail: adminUser.email,
          createdAt: daysAgo(9, 1),
        },
      ],
    },
    {
      projectSlug: "mobile-companion",
      title: "Push notifications open blank screen when app is cold-started",
      description:
        "Tapping an urgent alert notification while the app is terminated lands on an empty white route before auth hydration finishes.",
      type: "bug",
      status: "open",
      priority: "high",
      source: "manual",
      reporterName: "Amina Hassan",
      reporterEmail: "amina@acme-demo.test",
      browserInfo: "iOS 18.2 / iPhone 15 Pro",
      createdAt: daysAgo(2, 5),
    },
    {
      projectSlug: "mobile-companion",
      title: "Add biometric lock toggle in Security settings",
      description:
        "Allow Face ID / Touch ID unlock when returning to the app after 5 minutes in background.",
      type: "feature",
      status: "open",
      priority: "medium",
      source: "public_form",
      reporterName: "Lucas Silva",
      reporterEmail: "lucas@fintechhub.br",
      createdAt: daysAgo(7, 2),
    },
    {
      projectSlug: "mobile-companion",
      title: "Reduce splash screen delay on Android 15 devices",
      description:
        "Cold start currently waits for font preloading on the main thread.",
      type: "improvement",
      status: "closed",
      priority: "low",
      source: "manual",
      reporterName: null,
      reporterEmail: null,
      createdAt: daysAgo(12, 7),
    },
    {
      projectSlug: "dev-docs",
      title: "Curl snippet in Quickstart missing Content-Type header",
      description:
        "Running the copy-pasted POST /api/v1/feedback snippet returns 400 Invalid JSON without -H 'Content-Type: application/json'.",
      type: "bug",
      status: "open",
      priority: "low",
      source: "extension",
      reporterName: "Hannah Weber",
      reporterEmail: "hannah@codecraft.de",
      pageUrl: "https://docs.acme-demo.test/quickstart",
      browserInfo: "Firefox 136.0 / macOS 15.3",
      createdAt: daysAgo(3, 1),
    },
    {
      projectSlug: "dev-docs",
      title: "Document webhook retry schedule and backoff jitter",
      description:
        "Customers asked how many times failed webhook deliveries are retried before being marked inactive.",
      type: "question",
      status: "open",
      priority: null,
      source: "public_form",
      reporterName: "Trevor Nguyen",
      reporterEmail: "trevor@shipfast.dev",
      createdAt: daysAgo(5, 9),
    },
  ];

  let createdNotes = 0;
  let createdEvents = 0;

  for (const item of demoFeedback) {
    const project = projectMap.get(item.projectSlug);
    if (!project) continue;

    const createdItem = await prisma.feedbackItem.create({
      data: {
        projectId: project.id,
        title: item.title,
        description: item.description,
        type: item.type,
        status: item.status,
        priority: item.priority,
        source: item.source,
        reporterName: item.reporterName,
        reporterEmail: item.reporterEmail,
        pageUrl: item.pageUrl ?? null,
        browserInfo: item.browserInfo ?? null,
        screenshotDataUrl: item.screenshotDataUrl ?? null,
        githubIssueUrl: item.githubIssueUrl ?? null,
        githubIssueNumber: item.githubIssueNumber ?? null,
        createdAt: item.createdAt,
      },
    });

    if (item.notes && item.notes.length > 0) {
      await prisma.feedbackNote.createMany({
        data: item.notes.map((n) => ({
          feedbackItemId: createdItem.id,
          authorEmail: n.authorEmail,
          body: n.body,
          createdAt: n.createdAt,
        })),
      });
      createdNotes += item.notes.length;
    }

    if (item.statusEvents && item.statusEvents.length > 0) {
      await prisma.feedbackStatusEvent.createMany({
        data: item.statusEvents.map((ev) => ({
          feedbackItemId: createdItem.id,
          fromStatus: ev.fromStatus,
          toStatus: ev.toStatus,
          actorEmail: ev.actorEmail,
          createdAt: ev.createdAt,
        })),
      });
      createdEvents += item.statusEvents.length;
    }
  }

  const demoRawKeys = [
    {
      projectSlug: "acme-web",
      name: "GitHub Actions CI Reporter",
      rawKey: "btk_demo_acme_ci_reporter_0000000000000000000001",
      lastUsedAt: daysAgo(0, 5),
      revokedAt: null,
    },
    {
      projectSlug: "acme-web",
      name: "Legacy Staging Script",
      rawKey: "btk_demo_acme_legacy_staging_000000000000000002",
      lastUsedAt: daysAgo(9, 0),
      revokedAt: daysAgo(4, 0),
    },
    {
      projectSlug: "checkout-api",
      name: "Payment Alert Monitor",
      rawKey: "btk_demo_checkout_monitor_000000000000000000003",
      lastUsedAt: daysAgo(0, 9),
      revokedAt: null,
    },
  ];

  let createdKeys = 0;
  for (const keySpec of demoRawKeys) {
    const project = projectMap.get(keySpec.projectSlug);
    if (!project) continue;

    await prisma.projectApiKey.create({
      data: {
        projectId: project.id,
        name: keySpec.name,
        keyPrefix: keySpec.rawKey.slice(0, 12),
        keyHash: hashApiKey(keySpec.rawKey),
        lastUsedAt: keySpec.lastUsedAt,
        revokedAt: keySpec.revokedAt,
      },
    });
    createdKeys += 1;
  }

  console.log("Local demo seed complete:");
  console.log(`- Admin account: ${adminUser.email}`);
  console.log(`- Projects upserted: ${demoProjects.length}`);
  console.log(`- Feedback items created: ${demoFeedback.length}`);
  console.log(`- Internal notes created: ${createdNotes}`);
  console.log(`- Status events created: ${createdEvents}`);
  console.log(`- API keys created: ${createdKeys}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
