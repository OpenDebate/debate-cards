import { db, Lock } from 'app/lib';
import { getSentences, Sentence, Info, Children, getMatching } from 'app/lib';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import { min, uniq } from 'lodash';
import { Queue } from 'typescript-collections';

const evidenceQueue = new Queue<{ gid: string }>();
const sentenceLock: Record<string, Lock> = {};
const mergeLock: Record<number, Lock> = {};

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

async function setParent(id: number, text: string) {
  const updates = [id.toString()];
  const sentences = getSentences(text) ?? [];

  const unlockSentences = () => {
    // Unlock for any cards waiting on sentence, then remove lock for future cards
    for (const sentence of sentences) {
      sentenceLock[sentence]?.unlock();
      delete sentenceLock[sentence];
    }
  };

  let matching: number[];
  try {
    // If any sentences in this card are being processed wait for them to finish, then mark sentneces as being procsessed
    for (const sentence of sentences) {
      await sentenceLock[sentence]?.promise;
      sentenceLock[sentence] = new Lock();
    }
    if (sentences.length) Info.set(id, 'length', sentences.length);

    // Get matching cards
    const existing = await Promise.all(sentences.map(Sentence.get));
    const filteredMatches = await getMatching(existing.flat());
    matching = await Promise.all(filteredMatches.map((card) => Info.get(card, 'parent')));
  } catch (e) {
    unlockSentences();
    throw e;
  }

  const parent = min(matching) ?? id;
  const mLock = (mergeLock[parent] = new Lock());
  const toMerge = matching.filter((card) => card !== parent);

  try {
    // In rare case multiple different parents were matched, merge cards and update parents
    if (toMerge.length) {
      // If cards are being added to a given bucket, wait to merge that bucket
      for (const card of toMerge) await mergeLock[card]?.promise;
      const children = await Promise.all(toMerge.map(Children.get));
      updates.push(...children.flat());
    }

    sentences.forEach((sentence, i) => Sentence.set(sentence, [{ cardId: id, index: i }]));
    await updateParents(uniq(updates), parent);
  } catch (e) {
    console.error(e);
  } finally {
    unlockSentences();
    // If lock on parent hasnt been overwritten, unlock it
    if (mergeLock[parent] === mLock) {
      mergeLock[parent]?.unlock();
      delete mergeLock[parent];
    }
  }
}

onAddEvidence.on((data) => evidenceQueue.enqueue(data));

const drain = async () => {
  // TODO: Add chunks of unduplicated cards from db if queue is empty
  if (evidenceQueue.size() === 0) setTimeout(drain, 1000);
  else {
    const { gid } = evidenceQueue.dequeue();
    const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });

    setParent(id, fulltext).catch(console.error).finally(drain);
  }
};

for (let i = 0; i < CONCURRENT_DEDUPLICATION; i++) drain();
