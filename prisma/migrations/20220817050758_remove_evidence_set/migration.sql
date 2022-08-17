/*
  Warnings:

  - You are about to drop the column `evidenceSetId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the `EvidenceSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_evidenceSetId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "evidenceSetId";

-- DropTable
DROP TABLE "EvidenceSet";
