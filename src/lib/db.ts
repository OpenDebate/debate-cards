import { Prisma, PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
export const connectOrCreateTag = (name: string, label: string): Prisma.TagsCreateOrConnectWithoutFilesInput => ({
  where: { name },
  create: { name, label },
});
