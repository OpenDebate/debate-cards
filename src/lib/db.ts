import { Prisma, PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
export type TagInput = {
  name: string;
  label: string;
};
export const connectOrCreateTag = ({ name, label }: TagInput): Prisma.TagCreateOrConnectWithoutFilesInput => ({
  where: { name },
  create: { name, label },
});
