/*
  Warnings:

  - A unique constraint covering the columns `[roundId]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "roundId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "File_roundId_key" ON "File"("roundId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
