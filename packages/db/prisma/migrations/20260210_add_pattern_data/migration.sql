-- Add pattern support to Track
ALTER TABLE "Track" ADD COLUMN "patternData" JSONB;
ALTER TABLE "Track" ADD COLUMN "notationAbc" TEXT;

-- Make audioFileUrl nullable (pattern tracks don't have audio files)
ALTER TABLE "Track" ALTER COLUMN "audioFileUrl" DROP NOT NULL;
