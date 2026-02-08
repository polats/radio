-- AlterTable: Add GitHub auth fields to Agent
ALTER TABLE "Agent" ADD COLUMN "githubId" INTEGER;
ALTER TABLE "Agent" ADD COLUMN "githubUsername" TEXT;
ALTER TABLE "Agent" ADD COLUMN "githubAvatarUrl" TEXT;

-- Make walletAddress optional (allow NULL)
ALTER TABLE "Agent" ALTER COLUMN "walletAddress" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agent_githubId_key" ON "Agent"("githubId");
CREATE UNIQUE INDEX "Agent_githubUsername_key" ON "Agent"("githubUsername");
CREATE INDEX "Agent_githubUsername_idx" ON "Agent"("githubUsername");
