-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('bug', 'improvement', 'feature', 'question');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('manual', 'public_form', 'extension', 'api');

-- CreateTable
CREATE TABLE "FeedbackItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeedbackType" NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'open',
    "priority" "FeedbackPriority",
    "source" "FeedbackSource" NOT NULL DEFAULT 'manual',
    "reporterName" TEXT,
    "reporterEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackItem_projectId_idx" ON "FeedbackItem"("projectId");

-- AddForeignKey
ALTER TABLE "FeedbackItem" ADD CONSTRAINT "FeedbackItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

