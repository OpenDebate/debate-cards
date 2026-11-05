import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Export a factory so each Queue/Worker gets its own IORedis instance.
// BullMQ requires separate connections for workers (blocking BRPOPLPUSH)
// vs queues (non-blocking). Sharing one instance causes workers to stall.
export const connection = new IORedis(REDIS_URL, {
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const createConnection = () =>
  new IORedis(REDIS_URL, {
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });
