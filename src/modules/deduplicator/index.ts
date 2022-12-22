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
            orderBy: { id: 'asc' }, // Sequential cards are less likley to be duplicates, reduces contention,
            take: take ?? undefined,
          }),
        );
      return tasks;
    },
  ),
};
