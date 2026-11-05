import { db } from 'app/lib';
import { dedupQueue } from './queue';

export async function loadDedupJobs(args: { gids?: string[]; loadPending: boolean; take?: number }): Promise<number> {
  let tasks: { gid: string }[] = [];
  if (args.gids) tasks = tasks.concat(args.gids.map((gid) => ({ gid })));
  if (args.loadPending)
    tasks = tasks.concat(
      await db.evidence.findMany({
        where: { bucketId: null },
        select: { gid: true },
        orderBy: { id: 'asc' },
        take: args.take ?? undefined,
      }),
    );

  if (tasks.length > 0) {
    await dedupQueue.addBulk(
      tasks.map((task) => ({
        name: `dedup:${task.gid}`,
        data: task,
      })),
    );
  }

  return tasks.length;
}
