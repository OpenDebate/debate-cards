import { connection } from 'app/lib/queues/connection';
import { defaultJobOptions } from 'app/lib/queues/options';
import { Queue } from 'bullmq';

export const dedupQueue = new Queue('dedup', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: 'exponential', delay: 500 },
  },
});
