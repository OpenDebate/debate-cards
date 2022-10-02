-- CreateIndex
CREATE INDEX "Cite_roundId_idx" ON "Cite"("roundId");

-- CreateIndex
CREATE INDEX "Evidence_fileId_idx" ON "Evidence"("fileId");

-- CreateIndex
CREATE INDEX "Evidence_bucketId_idx" ON "Evidence"("bucketId");

-- CreateIndex
CREATE INDEX "File_roundId_idx" ON "File"("roundId");

-- CreateIndex
CREATE INDEX "Round_teamId_idx" ON "Round"("teamId");

-- CreateIndex
CREATE INDEX "School_caselistId_idx" ON "School"("caselistId");

-- CreateIndex
CREATE INDEX "Team_teamId_idx" ON "Team"("teamId");
