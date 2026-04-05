import { db } from 'app/lib';
import { parseQueue } from './queue';

export async function loadParseJobs(args: { gids?: string[]; loadPending: boolean }): Promise<number> {
  let tasks: { gid: string }[] = [];
  if (args.gids) tasks = tasks.concat(args.gids.map((gid) => ({ gid })));
  if (args.loadPending)
    tasks = tasks.concat(
      await db.file.findMany({ where: { status: { equals: 'PENDING' } }, select: { gid: true } }),
    );

  if (tasks.length > 0) {
    await parseQueue.addBulk(
      tasks.map((task) => ({
        name: `parse:${task.gid}`,
        data: task,
      })),
    );
  }

  return tasks.length;
}
