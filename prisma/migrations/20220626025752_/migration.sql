-- CreateEnum
CREATE TYPE "Side" AS ENUM ('AFF', 'NEG');

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
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gid" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT E'PENDING',
    "wiki" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "tournament" TEXT NOT NULL,
    "roundNum" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "judge" TEXT NOT NULL,
    "roundReport" TEXT,
    "cites" TEXT[],
    "openSourceUrl" TEXT,
    "openSourceId" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT E'PENDING',
    "evidenceSetId" INTEGER,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSet" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "EvidenceSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileId" INTEGER NOT NULL,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceBucket_rootId_key" ON "EvidenceBucket"("rootId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_gid_key" ON "Evidence"("gid");

-- CreateIndex
CREATE UNIQUE INDEX "Round_gid_key" ON "Round"("gid");

-- CreateIndex
CREATE UNIQUE INDEX "File_gid_key" ON "File"("gid");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceSet_name_key" ON "EvidenceSet"("name");

-- AddForeignKey
ALTER TABLE "EvidenceBucket" ADD CONSTRAINT "EvidenceBucket_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "EvidenceBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_openSourceId_fkey" FOREIGN KEY ("openSourceId") REFERENCES "File"("gid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_evidenceSetId_fkey" FOREIGN KEY ("evidenceSetId") REFERENCES "EvidenceSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
