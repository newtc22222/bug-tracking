-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");

