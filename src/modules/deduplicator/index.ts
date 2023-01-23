import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import dedupeFile from 'app/actions/dedupeFile';
import { ActionQueue, db } from 'app/lib';

export default {
  name: 'deduplication',
  queue: new ActionQueue(
    'dedup',
    dedupeFile,
    CONCURRENT_DEDUPLICATION,
    onAddEvidence,
    async ({ gids, loadPending }: { gids?: string[]; loadPending: boolean }) => {
      let tasks: { gid: string }[] = [];
      if (gids) tasks = tasks.concat(gids.map((gid) => ({ gid })));
      if (loadPending) tasks = await db.evidence.findMany({ where: { bucketId: null }, select: { gid: true } });

      return tasks;
    },
  ),
};
