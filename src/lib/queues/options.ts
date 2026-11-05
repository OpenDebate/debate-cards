import { DefaultJobOptions } from 'bullmq';

/**
 * Shared job defaults.
 *
 * Retention matters here: a full scrape produces hundreds of thousands of
 * parse/dedup jobs, and without caps BullMQ keeps every payload and result in
 * Redis forever. Retries matter because a transient network/DB blip would
 * otherwise permanently drop that unit of work.
 */
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
};
