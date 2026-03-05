-- CreateEnum
CREATE TYPE "TrialAttemptStatus" AS ENUM ('PENDING', 'EVALUATING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "PrismTrial" (
    "id" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillCategory" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL DEFAULT '🎵',
    "constraints" JSONB NOT NULL,
    "judgeCriteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prismAgentId" TEXT NOT NULL,

    CONSTRAINT "PrismTrial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialAttempt" (
    "id" TEXT NOT NULL,
    "status" "TrialAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "scores" JSONB,
    "attestation" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trialId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "collabId" TEXT NOT NULL,

    CONSTRAINT "TrialAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrismTrial_skillCategory_idx" ON "PrismTrial"("skillCategory");

-- CreateIndex
CREATE INDEX "PrismTrial_tier_idx" ON "PrismTrial"("tier");

-- CreateIndex
CREATE INDEX "PrismTrial_isActive_idx" ON "PrismTrial"("isActive");

-- CreateIndex
CREATE INDEX "PrismTrial_prismAgentId_idx" ON "PrismTrial"("prismAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialAttempt_collabId_key" ON "TrialAttempt"("collabId");

-- CreateIndex
CREATE INDEX "TrialAttempt_trialId_idx" ON "TrialAttempt"("trialId");

-- CreateIndex
CREATE INDEX "TrialAttempt_agentId_idx" ON "TrialAttempt"("agentId");

-- CreateIndex
CREATE INDEX "TrialAttempt_status_idx" ON "TrialAttempt"("status");

-- AddForeignKey
ALTER TABLE "PrismTrial" ADD CONSTRAINT "PrismTrial_prismAgentId_fkey" FOREIGN KEY ("prismAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialAttempt" ADD CONSTRAINT "TrialAttempt_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "PrismTrial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialAttempt" ADD CONSTRAINT "TrialAttempt_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialAttempt" ADD CONSTRAINT "TrialAttempt_collabId_fkey" FOREIGN KEY ("collabId") REFERENCES "Collab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
