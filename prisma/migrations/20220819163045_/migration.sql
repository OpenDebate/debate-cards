-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'ERROR');

-- CreateTable
CREATE TABLE "EvidenceBucket" (
    "id" SERIAL NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "rootId" INTEGER NOT NULL,

    CONSTRAINT "EvidenceBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gid" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "cite" TEXT,
    "fullcite" TEXT,
    "summary" TEXT,
    "spoken" TEXT,
    "fulltext" TEXT,
    "markup" TEXT NOT NULL,
    "pocket" TEXT,
    "hat" TEXT,
    "block" TEXT,
    "fileId" INTEGER,
    "bucketId" INTEGER,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "roundId" INTEGER,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caselist" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caselistId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL,
    "archiveUrl" TEXT,

    CONSTRAINT "Caselist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "state" TEXT,
    "chapterId" INTEGER,
    "archived" BOOLEAN NOT NULL,
    "caselistId" INTEGER NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "debater1First" TEXT NOT NULL,
    "debater1Last" TEXT NOT NULL,
    "debater1StudentId" INTEGER,
    "debater2First" TEXT,
    "debater2Last" TEXT,
    "debater2StudentId" INTEGER,
    "debater3First" TEXT,
    "debater3Last" TEXT,
    "debater3StudentId" INTEGER,
    "debater4First" TEXT,
    "debater4Last" TEXT,
    "debater4StudentId" INTEGER,
    "archived" BOOLEAN NOT NULL,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "tournament" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "judge" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "opensourcePath" TEXT,
    "video" TEXT,
    "tournId" INTEGER,
    "externalId" INTEGER,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cite" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "citeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "cites" TEXT NOT NULL,
    "roundId" INTEGER NOT NULL,

    CONSTRAINT "Cite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FileToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceBucket_rootId_key" ON "EvidenceBucket"("rootId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_gid_key" ON "Evidence"("gid");

-- CreateIndex
CREATE UNIQUE INDEX "File_gid_key" ON "File"("gid");

-- CreateIndex
CREATE UNIQUE INDEX "File_roundId_key" ON "File"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Caselist_caselistId_key" ON "Caselist"("caselistId");

-- CreateIndex
CREATE UNIQUE INDEX "Caselist_name_key" ON "Caselist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolId_key" ON "School"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamId_key" ON "Team"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roundId_key" ON "Round"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Cite_citeId_key" ON "Cite"("citeId");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToTag_AB_unique" ON "_FileToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToTag_B_index" ON "_FileToTag"("B");

-- AddForeignKey
ALTER TABLE "EvidenceBucket" ADD CONSTRAINT "EvidenceBucket_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "EvidenceBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_caselistId_fkey" FOREIGN KEY ("caselistId") REFERENCES "Caselist"("caselistId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("teamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cite" ADD CONSTRAINT "Cite_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("roundId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
