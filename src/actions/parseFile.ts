import addEvidence from 'app/actions/addEvidence';
import { db, pipe } from 'app/lib';

import { documentToTokens, extractCards, makeChildId } from 'app/lib/debate-tools';

export default async ({ gid }: { gid: string }) => {
  try {
    const cards = await pipe(
      (gid: string) => db.file.findUnique({ where: { gid }, select: { path: true } }),
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
