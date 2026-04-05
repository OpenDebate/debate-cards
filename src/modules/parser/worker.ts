import { Worker, Job } from 'bullmq';
import { createConnection } from 'app/lib/queues/connection';
import parseFile from 'app/actions/parseFile';
import { CONCURRENT_PARSERS } from 'app/constants';
import { dedupQueue } from 'app/modules/deduplicator/queue';
import { attachFailureLogger } from 'app/lib/failureLogger';

export const parseWorker = new Worker(
  'parse',
  async (job: Job<{ gid: string }>) => {
    const { gid } = job.data;
    const { evidenceGids } = await parseFile({ gid });

    if (evidenceGids.length > 0) {
      await dedupQueue.addBulk(
        evidenceGids.map((evidenceGid) => ({
          name: `dedup:${evidenceGid}`,
          data: { gid: evidenceGid },
        })),
      );
    }

    return { gid, evidenceCount: evidenceGids.length };
  },
  {
    connection: createConnection(),
    concurrency: CONCURRENT_PARSERS,
    lockDuration: 5 * 60 * 1000,
  },
);
attachFailureLogger(parseWorker);
