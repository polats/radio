-- Add child agent fields
ALTER TABLE "Agent" ADD COLUMN "repoName" TEXT;
ALTER TABLE "Agent" ADD COLUMN "parentId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraint for parent+repo combination
CREATE UNIQUE INDEX "Agent_parentId_repoName_key" ON "Agent"("parentId", "repoName");

-- Add index for parentId
CREATE INDEX "Agent_parentId_idx" ON "Agent"("parentId");
