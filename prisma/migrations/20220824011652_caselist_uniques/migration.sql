/*
  Warnings:

  - A unique constraint covering the columns `[name,caselistId]` on the table `School` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,schoolId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "School_name_caselistId_key" ON "School"("name", "caselistId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_schoolId_key" ON "Team"("name", "schoolId");
