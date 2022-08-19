ALTER TABLE "Tags" RENAME TO "Tag";

ALTER TABLE "_FileToTags" RENAME TO "_FileToTag";

-- AlterTable
ALTER TABLE "Tag" RENAME CONSTRAINT "Tags_pkey" TO "Tag_pkey";

-- RenameIndex
ALTER INDEX "Tags_name_key" RENAME TO "Tag_name_key";

-- RenameIndex
ALTER INDEX "_FileToTags_AB_unique" RENAME TO "_FileToTag_AB_unique";

-- RenameIndex
ALTER INDEX "_FileToTags_B_index" RENAME TO "_FileToTag_B_index";
