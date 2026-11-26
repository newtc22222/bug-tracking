-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('system', 'light', 'dark');
CREATE TYPE "ThemeAccent" AS ENUM ('slate', 'indigo', 'emerald', 'amber', 'rose');

-- AlterTable: WorkspaceSettings
ALTER TABLE "WorkspaceSettings"
ADD COLUMN "themeMode" "ThemeMode" NOT NULL DEFAULT 'system',
ADD COLUMN "themeAccent" "ThemeAccent" NOT NULL DEFAULT 'slate';

-- CreateTable: Label
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Label_projectId_idx" ON "Label"("projectId");
ALTER TABLE "Label" ADD CONSTRAINT "Label_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: FeedbackLabel
CREATE TABLE "FeedbackLabel" (
    "feedbackItemId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "FeedbackLabel_pkey" PRIMARY KEY ("feedbackItemId","labelId")
);

CREATE INDEX "FeedbackLabel_labelId_idx" ON "FeedbackLabel"("labelId");
ALTER TABLE "FeedbackLabel" ADD CONSTRAINT "FeedbackLabel_feedbackItemId_fkey" FOREIGN KEY ("feedbackItemId") REFERENCES "FeedbackItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackLabel" ADD CONSTRAINT "FeedbackLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SavedView
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);
