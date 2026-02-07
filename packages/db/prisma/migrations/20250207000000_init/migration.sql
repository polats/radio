-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'MIXING', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVISION');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "soulMd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collab" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "genre" TEXT,
    "tempo" INTEGER,
    "mood" TEXT,
    "keySignature" TEXT,
    "status" "CollabStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Collab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startBeat" INTEGER NOT NULL DEFAULT 0,
    "durationBeats" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collabId" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "description" TEXT,
    "audioFileUrl" TEXT NOT NULL,
    "waveformData" JSONB,
    "durationMs" INTEGER,
    "sampleRate" INTEGER,
    "status" "TrackStatus" NOT NULL DEFAULT 'PENDING',
    "creatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collabId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldMaster" (
    "id" TEXT NOT NULL,
    "audioFileUrl" TEXT NOT NULL,
    "waveformData" JSONB,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collabId" TEXT NOT NULL,

    CONSTRAINT "GoldMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    "goldMasterId" TEXT NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_walletAddress_key" ON "Agent"("walletAddress");

-- CreateIndex
CREATE INDEX "Agent_walletAddress_idx" ON "Agent"("walletAddress");

-- CreateIndex
CREATE INDEX "Collab_status_idx" ON "Collab"("status");

-- CreateIndex
CREATE INDEX "Collab_creatorId_idx" ON "Collab"("creatorId");

-- CreateIndex
CREATE INDEX "Section_collabId_idx" ON "Section"("collabId");

-- CreateIndex
CREATE INDEX "Track_sectionId_idx" ON "Track"("sectionId");

-- CreateIndex
CREATE INDEX "Track_submitterId_idx" ON "Track"("submitterId");

-- CreateIndex
CREATE INDEX "Track_status_idx" ON "Track"("status");

-- CreateIndex
CREATE INDEX "Message_collabId_idx" ON "Message"("collabId");

-- CreateIndex
CREATE INDEX "Message_authorId_idx" ON "Message"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "GoldMaster_collabId_key" ON "GoldMaster"("collabId");

-- CreateIndex
CREATE INDEX "GoldMaster_createdAt_idx" ON "GoldMaster"("createdAt");

-- CreateIndex
CREATE INDEX "Like_goldMasterId_idx" ON "Like"("goldMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_agentId_goldMasterId_key" ON "Like"("agentId", "goldMasterId");

-- AddForeignKey
ALTER TABLE "Collab" ADD CONSTRAINT "Collab_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_collabId_fkey" FOREIGN KEY ("collabId") REFERENCES "Collab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_collabId_fkey" FOREIGN KEY ("collabId") REFERENCES "Collab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldMaster" ADD CONSTRAINT "GoldMaster_collabId_fkey" FOREIGN KEY ("collabId") REFERENCES "Collab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_goldMasterId_fkey" FOREIGN KEY ("goldMasterId") REFERENCES "GoldMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

