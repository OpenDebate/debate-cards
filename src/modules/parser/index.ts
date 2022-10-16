import { onAddFile } from 'app/actions/addFile';
import parseFile from 'app/actions/parseFile';
import { CONCURRENT_PARSERS } from 'app/constants';
import { db, ActionQueue } from 'app/lib';

export default {
  name: 'parser',
  queue: new ActionQueue('parse', parseFile, CONCURRENT_PARSERS, onAddFile, async ({ gids }: { gids?: string[] }) =>
    gids
      ? gids.map((gid) => ({ gid }))
      : db.file.findMany({ where: { status: { equals: 'PENDING' } }, select: { gid: true } }),
  ),
};
