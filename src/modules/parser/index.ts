import { onAddFile } from 'app/actions/addFile';
import parseFile from 'app/actions/parseFile';
import { CONCURRENT_PARSERS } from 'app/constants';
import { db, ActionQueue } from 'app/lib';

export default {
  name: 'parser',
  queue: new ActionQueue(parseFile, CONCURRENT_PARSERS, onAddFile, () =>
    db.file.findMany({ where: { status: { equals: 'PENDING' } }, select: { gid: true } }),
  ),
};
