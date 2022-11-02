import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import dedupeEvidence from 'app/actions/dedupeEvidence';
import { ActionQueue, db } from 'app/lib';

export default {
  name: 'deduplication',
  queue: new ActionQueue(
    'dedup',
    dedupeEvidence,
    CONCURRENT_DEDUPLICATION,
    onAddEvidence,
    async ({ gids, loadPending, take }: { gids?: string[]; loadPending: boolean; take?: number }) => {
      let tasks: { gid: string }[] = [];
      if (gids) tasks = tasks.concat(gids.map((gid) => ({ gid })));
      if (loadPending)
        tasks = tasks.concat(
          await db.evidence.findMany({
            where: { bucketId: null },
            select: { gid: true },
            // Setting a value for take makes the results be returned in order
            // This reduces contention because cards from the same file are less likley to be duplicates
            take: take ?? 1000 * 1000 * 1000,
          }),
        );
      return tasks;
    },
  ),
};
