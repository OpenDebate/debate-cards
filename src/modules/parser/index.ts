import addEvidence from 'app/actions/addEvidence';
import { onAddFile } from 'app/actions/addFile';
import { db, pipe } from 'app/lib';
import { CONCURRENT_PARSERS } from 'app/constants';
import { documentToTokens, extractCards, makeChildId } from 'app/lib/debate-tools';
import { Queue } from 'typescript-collections';

const fileQueue = new Queue<string>();

(async () => {
  const pending = await db.file.findMany({ where: { status: { equals: 'PENDING' } } });
  pending.forEach((file) => fileQueue.add(file.gid));
  for (let i = 0; i < CONCURRENT_PARSERS; i++) drain();
})();

const parseFile = async (gid: string) => {
  try {
    const cards = await pipe(
      (gid: string) => db.file.findUnique({ where: { gid } }),
      (file) => file.path,
      documentToTokens,
      extractCards,
    )(gid);

    // await Promise.all(cards.map((card, i) => addEvidence({ ...card, gid: makeChildId(gid, +i), file: { gid } })));
    for (const card of cards) await addEvidence({ ...card, gid: makeChildId(gid, card.index), file: { gid } });
    await db.file.update({ where: { gid }, data: { status: 'PROCESSED' } });
  } catch (e) {
    console.error(e);
    await db.file.update({ where: { gid }, data: { status: 'ERROR' } });
  }
};

const drain = () => {
  if (fileQueue.size() === 0) setTimeout(drain, 100);
  else parseFile(fileQueue.dequeue()).then(() => drain());
};

onAddFile.on((data) => fileQueue.enqueue(data.gid));

export default {
  main: null,
  name: 'parser',
};
