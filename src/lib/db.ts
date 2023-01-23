import { Prisma, PrismaClient } from '@prisma/client';

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;

export const db = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') global.prisma = db;
export const connectOrCreateTag = (name: string, label: string): Prisma.TagsCreateOrConnectWithoutFilesInput => ({
  where: { name },
  create: { name, label },
});
