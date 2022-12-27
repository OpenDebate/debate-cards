import { db } from 'app/lib';
import { dedup, getSentences } from 'app/lib/debate-tools/duplicate';
import { onAddEvidence } from './addEvidence';

// Note: Redis updates and postgres updates are atomic, but does not guarantee that if redis was updated so was database
export default async ({ gid }: { gid: string }): Promise<any> => {
  try {
    const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });
    const sentences = getSentences(fulltext) ?? [];
    const { deletes, updates } = await dedup(id, sentences);
    try {
      return await db.$transaction([
        db.evidenceBucket.deleteMany({ where: { rootId: { in: deletes } } }),
        ...updates.map(({ bucketId: rootId, cardIds }) =>
          db.evidenceBucket.upsert({
            where: { rootId },
            create: { rootId, count: cardIds.length, evidence: { connect: cardIds.map((id) => ({ id })) } },
            update: { rootId, count: cardIds.length, evidence: { set: cardIds.map((id) => ({ id })) } },
          }),
        ),
      ]);
    } catch (err) {
      console.error(`Database error deduping ${gid}, retrying`, err);
      return onAddEvidence.emit({ gid }); // Retry in case of database error
    }
  } catch (err) {
    throw new Error(`Failed to dedup ${gid}`, { cause: err });
  }
};
