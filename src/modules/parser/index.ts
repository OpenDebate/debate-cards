import addEvidence from 'app/actions/addEvidence';
import { onAddFile } from 'app/actions/addFile';
import { db, pipe } from 'app/lib';
import { documentToTokens, extractCards, makeChildId } from 'app/lib/debate-tools';
import { readFile } from 'fs/promises';
import { Queue } from 'typescript-collections';

const fileQueue = new Queue<string>();

(async () => {
  const pending = await db.file.findMany({ where: { status: { equals: 'PENDING' } } });
  pending.forEach((file) => fileQueue.add(file.gid));
  drain();
})();

const parseFile = async (gid: string) => {
  try {
    const cards = await pipe(
      (gid: string) => db.file.findUnique({ where: { gid } }),
      (file) => readFile(file.path),
      documentToTokens,
      extractCards,
    )(gid);

    for (const i in cards)
      try {
        await addEvidence({ ...cards[i], gid: makeChildId(gid, +i), file: { gid } });
      } catch (e) {
        console.error(e);
      }

    await db.file.update({ where: { gid }, data: { status: 'PROCESSED' } });
  } catch (e) {
    await db.file.update({ where: { gid }, data: { status: 'ERROR' } });
  }
};

const drain = () => {
  if (fileQueue.size() === 0) setTimeout(drain, 10000);
  else parseFile(fileQueue.dequeue()).then(() => drain());
};

onAddFile.on((data) => fileQueue.enqueue(data.gid));

export default {
  main: null,
  name: 'parser',
};
