import { db, Children } from 'app/lib';
import { findParent } from 'app/lib/debate-tools';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import { Queue } from 'typescript-collections';

const evidenceQueue = new Queue<{ gid: string }>();

// Update parents in database and redis
async function updateParents(cardIds: string[], parentId: number) {
  Children.set(parentId, cardIds);
  const bucket = await db.evidenceBucket.upsert({
    where: { rootId: parentId },
    create: { rootId: parentId },
    update: { count: { increment: cardIds.length } },
  });
  return db.evidence.updateMany({
    where: { id: { in: cardIds.map(Number) } },
    data: { bucketId: bucket.id },
  });
}

onAddEvidence.on((data) => evidenceQueue.enqueue(data));

const drain = async () => {
  // TODO: Add chunks of unduplicated cards from db if queue is empty
  try {
    if (evidenceQueue.size() === 0) return setTimeout(drain, 1000);
    else {
      const { gid } = evidenceQueue.dequeue();
      const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });
      const { updates, parent } = await findParent(id, fulltext);
      await updateParents(updates, parent);
    }
  } catch (e) {
    console.error(e);
  }
  setImmediate(drain);
};

for (let i = 0; i < CONCURRENT_DEDUPLICATION; i++) drain();
