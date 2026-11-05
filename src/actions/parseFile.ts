import addEvidence from 'app/actions/addEvidence';
import { db, pipe } from 'app/lib';

import { documentToTokens, extractCards, makeChildId } from 'app/lib/debate-tools';

export default async ({ gid }: { gid: string }): Promise<{ evidenceGids: string[] }> => {
  try {
    const cards = await pipe(
      (gid: string) => db.file.findUnique({ where: { gid }, select: { path: true } }),
      (file) => file.path,
      documentToTokens,
      extractCards,
    )(gid);

    const results = await Promise.all(
      cards.map((card, i) => addEvidence({ ...card, gid: makeChildId(gid, +i), file: { gid } })),
    );

    await db.file.update({ where: { gid }, data: { status: 'PROCESSED' } });
    return { evidenceGids: results.map((r) => r.gid) };
  } catch (e) {
    await db.file.updateMany({ where: { gid }, data: { status: 'ERROR' } });
    throw new Error(`Error parsing ${gid}: ${e.message}`);
  }
};
