import { db, Children, Lock } from 'app/lib';
import { findParent } from 'app/lib/debate-tools';
const updateLock: Record<number, Lock> = {};

export default async ({ gid }: { gid: string }): Promise<any> => {
  const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });
  const { updates, parent } = await findParent(id, fulltext);

  // Only wait if it actually exists, otherwise it wont get set in time
  if (updateLock[parent]) await updateLock[parent].promise;
  const lock = (updateLock[parent] = new Lock());

  Children.set(parent, updates);
  const bucket = await db.evidenceBucket.upsert({
    where: { rootId: parent },
    create: { rootId: parent },
    update: { count: { increment: updates.length } },
  });
  await db.evidence.updateMany({
    where: { id: { in: updates.map(Number) } },
    data: { bucketId: bucket.id },
  });

  lock.unlock();
  if (updateLock[parent] === lock) delete updateLock[parent];
};
