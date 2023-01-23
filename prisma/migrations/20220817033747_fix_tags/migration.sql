/*
  Warnings:

  - You are about to drop the column `fileId` on the `Tags` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Tags` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Tags" DROP CONSTRAINT "Tags_fileId_fkey";

-- AlterTable
ALTER TABLE "Tags" DROP COLUMN "fileId";

-- CreateTable
CREATE TABLE "_FileToTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FileToTags_AB_unique" ON "_FileToTags"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToTags_B_index" ON "_FileToTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Tags_name_key" ON "Tags"("name");

-- AddForeignKey
ALTER TABLE "_FileToTags" ADD CONSTRAINT "_FileToTags_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTags" ADD CONSTRAINT "_FileToTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
