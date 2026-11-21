-- AlterTable
ALTER TABLE "Project" ADD COLUMN "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "FeedbackItem" ADD COLUMN "pageUrl" TEXT,
ADD COLUMN "browserInfo" TEXT,
ADD COLUMN "screenshotDataUrl" TEXT,
ADD COLUMN "githubIssueUrl" TEXT,
ADD COLUMN "githubIssueNumber" INTEGER;
