import { connection } from 'app/lib/queues/connection';
import { Queue } from 'bullmq';

export const dedupQueue = new Queue('dedup', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
  },
});
