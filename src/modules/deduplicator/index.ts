import { db } from 'app/lib';
import { getSentences, Sentence, Info, Children, getMatching } from 'app/lib';
import { onAddEvidence } from 'app/actions/addEvidence';
import { filter, min, uniq } from 'lodash';
import { Queue } from 'typescript-collections';

const evidenceQueue = new Queue<{ gid: string }>();

// Update parents in database and redis, dont need to actaully wait for database response
async function updateParents(cardIds: string[], parentId: number) {
  Children.set(parentId, cardIds);
  const bucket = await db.evidenceBucket.upsert({
    where: { rootId: parentId },
    create: { rootId: parentId },
    update: {
      count: {
        increment: cardIds.length,
      },
    },
  });
  return db.evidence.updateMany({
    where: { id: { in: cardIds.map(Number) } },
    data: {
      bucketId: bucket.id,
    },
  });
}

async function setParent(id: number, sentences: string[]) {
  const updates = [id.toString()];
  if (sentences.length) Info.set(id, 'l', sentences.length);

  // Get matching sentences
  const existing = filter(await Promise.all(sentences.map(Sentence.get)));
  // Get the parents of all the matches
  const existingParents = uniq(await Promise.all(existing.map((card) => Info.get(+card, 'p'))));
  // Try to filter coincidental matches
  const matching = await getMatching(filter(existingParents));
  const parent = min(matching) ?? id;

  // In rare case multiple different parents were matched, merge cards and update parents
  if (matching.length > 1) {
    await Promise.all(
      matching
        .filter((card) => card !== parent)
        .map((card) => Children.get(card).then((children) => updates.push(...children))),
    );
  }

  sentences.forEach((sentence) => Sentence.set(sentence, parent));
  return updateParents(uniq(updates), parent);
}

onAddEvidence.on((data) => evidenceQueue.enqueue(data));

const drain = async () => {
  // TODO: Add chunks of unduplicated cards from db if queue is empty
  if (evidenceQueue.size() === 0) setTimeout(drain, 1000);
  // Dosent actually wait for parent to be set, just till commands are sent
  else {
    const { gid } = evidenceQueue.dequeue();
    const { id, fulltext } = await db.evidence.findUnique({ where: { gid }, select: { id: true, fulltext: true } });
    const sentences = getSentences(fulltext) ?? [];

    setParent(id, sentences).catch(console.error).finally(drain);
  }
};

drain();
