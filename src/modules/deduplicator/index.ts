import { db } from 'app/lib';
import { getSentences, Sentence, Info, getChildren, getMatching, setRedisParents, DedupTask } from 'app/lib';
import { onAddEvidence } from 'app/actions/addEvidence';
import { filter, min, uniq } from 'lodash';
import { Queue } from 'typescript-collections';

const evidenceQueue = new Queue<DedupTask>();

// Update parents in database and redis, dont need to actaully wait for database response
async function updateParents(cardIds: string[], parentId: number) {
  setRedisParents(cardIds, parentId);
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
  // db.evidenceBucket.update({
  //   where: { id: bucket.id },
  //   data: {
  //     evidence: {
  //       connect: cardIds.map((id) => ({ id: +id })),
  //     },
  //   },
  // });
}

async function setParent({ text, id }: DedupTask) {
  let parent = id;
  const updates = [id.toString()];

  const sentences = getSentences(text);
  if (!sentences?.length) return updateParents(updates, parent);

  const existing = await Promise.all(sentences.map(Sentence.get));
  const matching = filter(await getMatching(existing));

  Info.set(id, 'l', sentences.length);
  if (matching.length) {
    // Get the parents of all the matches, use set to make sure they are unique
    const matchParents = uniq(await Promise.all(matching.map((card) => Info.get(+card, 'p'))));

    // If all matches have the same parent just set as parent
    if (matchParents.length === 1) parent = +matchParents[0];
    else {
      // In rare case multiple different parents were matched, merge cards and update parents
      parent = +min(matchParents);

      await Promise.all(
        matchParents
          .filter((card) => +card !== parent)
          .map((card) => getChildren(card).then((children) => updates.push(...children))),
      );
    }
  }

  // Commands will be sent in order so dont need to wait for respones
  sentences.forEach((sentence) => Sentence.set(sentence, parent));
  return updateParents(uniq(updates), parent);
}

onAddEvidence.on(({ gid }) =>
  db.evidence.findUnique({ where: { gid } }).then((evidence) =>
    evidenceQueue.enqueue({
      id: evidence.id,
      text: evidence.fulltext,
    }),
  ),
);

const drain = () => {
  // TODO: Add chunks of unduplicated cards from db if queue is empty
  if (evidenceQueue.size() === 0) setTimeout(drain, 1000);
  // Dosent actually wait for parent to be set, just till commands are sent
  else {
    const task = evidenceQueue.dequeue();
    const promise = setParent(task);
    promise.then(drain);
    promise.catch((e) => console.error(e));
  }
};

drain();
