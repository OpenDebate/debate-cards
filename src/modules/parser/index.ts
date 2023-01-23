import { onAddFile } from 'app/actions/addFile';
import parseFile from 'app/actions/parseFile';
import { CONCURRENT_PARSERS } from 'app/constants';
import { db, ActionQueue } from 'app/lib';

export default {
  name: 'parser',
  queue: new ActionQueue(
    'parse',
    parseFile,
    CONCURRENT_PARSERS,
    onAddFile,
    async ({ gids, loadPending }: { gids?: string[]; loadPending: boolean }) => {
      let tasks: { gid: string }[] = [];
      if (gids) tasks = tasks.concat(gids.map((gid) => ({ gid })));
      if (loadPending)
        tasks = tasks.concat(
          await db.file.findMany({ where: { status: { equals: 'PENDING' } }, select: { gid: true } }),
        );
      return tasks;
    },
  ),
};
