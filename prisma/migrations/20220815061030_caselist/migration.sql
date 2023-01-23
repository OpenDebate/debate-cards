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

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_caselistId_fkey" FOREIGN KEY ("caselistId") REFERENCES "Caselist"("caselistId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("teamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cite" ADD CONSTRAINT "Cite_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("roundId") ON DELETE RESTRICT ON UPDATE CASCADE;
