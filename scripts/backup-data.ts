import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";

async function main() {
  const [
    projects,
    feedbackItems,
    feedbackNotes,
    feedbackStatusEvents,
    feedbackLinks,
    externalIssueLinks,
    workspaceSettings,
    projectApiKeys,
  ] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.feedbackItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.feedbackNote.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.feedbackStatusEvent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.feedbackLink.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.externalIssueLink.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.workspaceSettings.findMany(),
    prisma.projectApiKey.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const backupDir = path.resolve(process.cwd(), "backups");
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `backup-${timestamp}.json`);

  const payload = {
    exportedAt: new Date().toISOString(),
    counts: {
      projects: projects.length,
      feedbackItems: feedbackItems.length,
      feedbackNotes: feedbackNotes.length,
      feedbackStatusEvents: feedbackStatusEvents.length,
      feedbackLinks: feedbackLinks.length,
      externalIssueLinks: externalIssueLinks.length,
      projectApiKeys: projectApiKeys.length,
    },
    projects,
    feedbackItems,
    feedbackNotes,
    feedbackStatusEvents,
    feedbackLinks,
    externalIssueLinks,
    workspaceSettings,
    projectApiKeys,
  };

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Backup written to ${filePath}`);
}

main()
  .catch((error) => {
    console.error("Backup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
