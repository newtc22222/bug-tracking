-- AlterEnum: FeedbackStatus
ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'todo';
ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'blocked';

-- AlterEnum: FeedbackPriority (append urgent last so DESC ordering is urgent > high > medium > low)
ALTER TYPE "FeedbackPriority" ADD VALUE IF NOT EXISTS 'urgent';

-- CreateEnum
CREATE TYPE "GitPlatform" AS ENUM ('none', 'github', 'gitlab', 'bitbucket', 'azure_devops', 'gitea', 'custom');

-- CreateEnum
CREATE TYPE "TrackerPlatform" AS ENUM ('none', 'github_issues', 'gitlab_issues', 'linear', 'jira', 'bitbucket_issues');

-- CreateEnum
CREATE TYPE "FeedbackLinkType" AS ENUM ('blocks', 'causes', 'duplicates', 'relates_to', 'parent_of');

-- CreateEnum
CREATE TYPE "LayoutWidth" AS ENUM ('full', 'wide', 'narrow');

-- CreateEnum
CREATE TYPE "PresentationMode" AS ENUM ('page', 'modal', 'drawer');

-- CreateEnum
CREATE TYPE "TicketViewMode" AS ENUM ('list_full', 'list_fixed', 'grid', 'kanban');

-- AlterTable: Project
ALTER TABLE "Project"
ADD COLUMN "keyPrefix" TEXT,
ADD COLUMN "nextSequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "gitPlatform" "GitPlatform" NOT NULL DEFAULT 'none',
ADD COLUMN "gitDefaultBranch" TEXT,
ADD COLUMN "trackerPlatform" "TrackerPlatform" NOT NULL DEFAULT 'none',
ADD COLUMN "trackerConfig" JSONB;

-- Backfill unique keyPrefix for existing projects
WITH ranked AS (
  SELECT
    id,
    UPPER(REGEXP_REPLACE(COALESCE(NULLIF(slug, ''), name), '[^A-Za-z0-9]', '', 'g')) AS clean,
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Project"
),
base_keys AS (
  SELECT
    id,
    rn,
    CASE
      WHEN LENGTH(clean) >= 3 THEN LEFT(clean, 4)
      WHEN LENGTH(clean) > 0 THEN clean
      ELSE 'PRJ'
    END AS candidate
  FROM ranked
),
deduped AS (
  SELECT
    id,
    CASE
      WHEN ROW_NUMBER() OVER (PARTITION BY candidate ORDER BY rn) = 1 THEN candidate
      ELSE LEFT(candidate, 6) || ROW_NUMBER() OVER (PARTITION BY candidate ORDER BY rn)::TEXT
    END AS final_key
  FROM base_keys
)
UPDATE "Project" p
SET "keyPrefix" = d.final_key
FROM deduped d
WHERE p.id = d.id;

ALTER TABLE "Project" ALTER COLUMN "keyPrefix" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "keyPrefix" SET DEFAULT 'PRJ';
CREATE UNIQUE INDEX "Project_keyPrefix_key" ON "Project"("keyPrefix");

-- Backfill gitPlatform & trackerPlatform for existing GitHub repoUrls
UPDATE "Project"
SET
  "gitPlatform" = CASE
    WHEN "repoUrl" ILIKE '%github.com%' THEN 'github'::"GitPlatform"
    WHEN "repoUrl" ILIKE '%gitlab.com%' THEN 'gitlab'::"GitPlatform"
    WHEN "repoUrl" ILIKE '%bitbucket.org%' THEN 'bitbucket'::"GitPlatform"
    WHEN "repoUrl" IS NOT NULL AND TRIM("repoUrl") <> '' THEN 'custom'::"GitPlatform"
    ELSE 'none'::"GitPlatform"
  END,
  "trackerPlatform" = CASE
    WHEN "repoUrl" ILIKE '%github.com%' THEN 'github_issues'::"TrackerPlatform"
    ELSE 'none'::"TrackerPlatform"
  END;

-- AlterTable: FeedbackItem
ALTER TABLE "FeedbackItem"
ADD COLUMN "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ticketKey" TEXT;

-- Backfill sequenceNumber and ticketKey for existing feedback items
WITH numbered AS (
  SELECT
    f.id,
    p."keyPrefix",
    ROW_NUMBER() OVER (PARTITION BY f."projectId" ORDER BY f."createdAt" ASC, f.id ASC) AS seq
  FROM "FeedbackItem" f
  JOIN "Project" p ON p.id = f."projectId"
)
UPDATE "FeedbackItem" f
SET
  "sequenceNumber" = n.seq,
  "ticketKey" = n."keyPrefix" || '-' || n.seq::TEXT
FROM numbered n
WHERE f.id = n.id;

-- Update Project.nextSequence based on max sequenceNumber
UPDATE "Project" p
SET "nextSequence" = COALESCE(
  (SELECT MAX(f."sequenceNumber") + 1 FROM "FeedbackItem" f WHERE f."projectId" = p.id),
  1
);

CREATE UNIQUE INDEX "FeedbackItem_ticketKey_key" ON "FeedbackItem"("ticketKey");
CREATE INDEX "FeedbackItem_status_idx" ON "FeedbackItem"("status");
CREATE INDEX "FeedbackItem_priority_idx" ON "FeedbackItem"("priority");

-- CreateTable: FeedbackLink
CREATE TABLE "FeedbackLink" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" "FeedbackLinkType" NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedbackLink_sourceId_targetId_relationType_key" ON "FeedbackLink"("sourceId", "targetId", "relationType");
CREATE INDEX "FeedbackLink_sourceId_idx" ON "FeedbackLink"("sourceId");
CREATE INDEX "FeedbackLink_targetId_idx" ON "FeedbackLink"("targetId");

ALTER TABLE "FeedbackLink" ADD CONSTRAINT "FeedbackLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FeedbackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackLink" ADD CONSTRAINT "FeedbackLink_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FeedbackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ExternalIssueLink
CREATE TABLE "ExternalIssueLink" (
    "id" TEXT NOT NULL,
    "feedbackItemId" TEXT NOT NULL,
    "provider" "TrackerPlatform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "externalStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalIssueLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalIssueLink_feedbackItemId_provider_externalId_key" ON "ExternalIssueLink"("feedbackItemId", "provider", "externalId");
CREATE INDEX "ExternalIssueLink_feedbackItemId_idx" ON "ExternalIssueLink"("feedbackItemId");

ALTER TABLE "ExternalIssueLink" ADD CONSTRAINT "ExternalIssueLink_feedbackItemId_fkey" FOREIGN KEY ("feedbackItemId") REFERENCES "FeedbackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing githubIssueUrl records into ExternalIssueLink
INSERT INTO "ExternalIssueLink" ("id", "feedbackItemId", "provider", "externalId", "externalKey", "externalUrl", "externalStatus")
SELECT
  'ext_' || f.id,
  f.id,
  'github_issues'::"TrackerPlatform",
  COALESCE(f."githubIssueNumber"::TEXT, f."githubIssueUrl"),
  CASE WHEN f."githubIssueNumber" IS NOT NULL THEN '#' || f."githubIssueNumber"::TEXT ELSE 'GitHub' END,
  f."githubIssueUrl",
  'open'
FROM "FeedbackItem" f
WHERE f."githubIssueUrl" IS NOT NULL AND TRIM(f."githubIssueUrl") <> '';

-- CreateTable: WorkspaceSettings
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "layoutWidth" "LayoutWidth" NOT NULL DEFAULT 'full',
    "defaultTicketView" "TicketViewMode" NOT NULL DEFAULT 'list_full',
    "newProjectMode" "PresentationMode" NOT NULL DEFAULT 'page',
    "newFeedbackMode" "PresentationMode" NOT NULL DEFAULT 'modal',
    "ticketReviewMode" "PresentationMode" NOT NULL DEFAULT 'drawer',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "completedTours" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorkspaceSettings" ("id") VALUES ('default') ON CONFLICT ("id") DO NOTHING;
