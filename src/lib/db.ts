import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// add prisma and redis to the NodeJS global type
interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient;
  redis: ReturnType<typeof createClient>;
}

// Prevent multiple instances of databases in development
declare const global: CustomNodeJsGlobal;

export const db = global.prisma || new PrismaClient();
export const redis = global.redis || createClient();

redis.connect();

if (process.env.NODE_ENV === 'development') {
  global.prisma = db;
  global.redis = redis;
}
