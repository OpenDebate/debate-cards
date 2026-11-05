import { Worker, Job } from 'bullmq';
import { createConnection } from 'app/lib/queues/connection';
import dedupeEvidence from 'app/actions/dedupeEvidence';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { attachFailureLogger } from 'app/lib/failureLogger';

export const dedupWorker = new Worker(
  'dedup',
  async (job: Job<{ gid: string }>) => {
    await dedupeEvidence(job.data);
    return { gid: job.data.gid };
  },
  {
    connection: createConnection(),
    concurrency: CONCURRENT_DEDUPLICATION,
    lockDuration: 5 * 60 * 1000,
  },
);
attachFailureLogger(dedupWorker);
