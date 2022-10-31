import { db } from 'app/lib';
import { dedup, getSentences } from 'app/lib/debate-tools/duplicate';

// Note: Redis updates and postgres updates are atomic, but does not garuntee that if redis was updated so was database
export default async ({ gid }: { gid: string }): Promise<any> => {
  const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });
  const sentences = getSentences(fulltext) ?? [];

  const { rootId, evidenceIds } = await dedup(id, sentences);

  return db.$transaction([
    db.evidenceBucket.deleteMany({ where: { rootId: { in: evidenceIds.filter((id) => id !== rootId) } } }),
    db.evidenceBucket.upsert({
      where: { rootId },
      create: { rootId, count: evidenceIds.length, evidence: { connect: evidenceIds.map((id) => ({ id })) } },
      update: { rootId, count: evidenceIds.length, evidence: { set: evidenceIds.map((id) => ({ id })) } },
    }),
  ]);
};
