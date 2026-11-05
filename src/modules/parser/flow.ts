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
    // Workers add parse jobs with a fixed jobId, so an old completed/failed job
    // record would silently block the re-add and strand the file. Clear first.
    await Promise.all(tasks.map((task) => parseQueue.remove(`parse:${task.gid}`).catch(() => undefined)));
    await parseQueue.addBulk(
      tasks.map((task) => ({
        name: `parse:${task.gid}`,
        data: task,
        opts: { jobId: `parse:${task.gid}` },
      })),
    );
  }

  return tasks.length;
}
