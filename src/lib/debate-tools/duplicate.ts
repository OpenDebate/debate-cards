import { EDGE_TOLERANCE, MIN_COUNT_FRACTION, SENTENCE_REGEX } from 'app/constants';
import { RedisContext, redis } from 'app/modules/deduplicator/redis';
import { db } from 'app/lib';
import { SubBucket } from 'app/modules/deduplicator/SubBucket';
import { WatchError } from 'redis';
import { maxBy, uniq } from 'lodash';

export type SentenceMatch = { matchId: number; index: number };

type MatchInfo = { cardLen: number; min: number; max: number };
type MatchPair = { matchCount: number; a: MatchInfo; b: MatchInfo };
const surroundRegex = (starting: string, ending: string) => new RegExp(`[${starting}]+[^${ending}]*[${ending}]+`, 'g');
export const getSentences = (text: string, cutoff = 20): string[] => {
  if (!text) return [];
  return text
    .replaceAll('¶', '\n')
    .replaceAll(/([A-Z]\.)+/g, (match) => match.replaceAll('.', '')) // Remove acronyms like A.B.C.
    .replaceAll(/(\w+['‘’]\w+)|(\w+s['‘’]\s)/g, (match) => match.replaceAll(/['‘’]/g, '')) // Remove ' from contractions and words ending in s'
    .replaceAll(surroundRegex(`"“`, `"”`), (match) => (/[.!?]/g.test(match) ? '. ' : match)) // Remove multiple sentence double quoted text
    .replaceAll(surroundRegex(`'‘`, `'’`), (match) => (/[.!?]/g.test(match) ? '. ' : match)) // Remove multiple sentence single quoted text
    .replaceAll(/\(+[^)]*\)+/g, '') // Remove text inside parentheses
    .split(SENTENCE_REGEX) // Split by sentence
    .map((el) => el.replace(/[^A-Z]/gi, '').toLowerCase()) // Remove non letter characters
    .filter((el: string) => el.length >= cutoff); // Filter tiny sentences
};

const isMatch = ({
  matchCount,
  a: { cardLen: aLen, min: aMin, max: aMax },
  b: { cardLen: bLen, min: bMin, max: bMax },
}: MatchPair) => {
  // Must match a minimum amount of each card
  if (matchCount < Math.max(aLen, bLen) * MIN_COUNT_FRACTION) return false;

  // Allow a percentage of non-matches at the edges to account for bad ocr and small parsing errors
  const aTolerance = Math.ceil(aLen * EDGE_TOLERANCE);
  const bTolerance = Math.ceil(bLen * EDGE_TOLERANCE);
  // Must match until the start of one card and to the end of one card
  // Can be the same (one card is inside the other) or different cards (end of one card overlaps with start of the other)
  return (aMin <= aTolerance || bMin <= bTolerance) && (aLen - 1 - aMax <= aTolerance || bLen - 1 - bMax <= bTolerance);
};

export async function getMatching(
  context: RedisContext,
  cardId: number,
  sentences?: string[],
): Promise<{ matches: number[]; existingSentences: boolean }> {
  if (!sentences) sentences = (await loadSentences(cardId)) ?? [];
  /* 
    Watch for change in sentences, prevents new card being added that this card should match and it being missed
    Will have a decent amonunt of false positives due to bucketing of sentences
    Probability a card completes without a retry is roughly
    (1 - ((sentencesPerCard * concurrentDeduplication) / numBuckets))^sentencesPerCard
    sentencesPerCard seems to be roughly 30
    With 25 concurrent deduplications happening, and 2^20 buckets, probability is around 0.98
  */
  const sentenceEntities = await context.sentenceRepository.getMany(sentences);
  const canidateIds = uniq(sentenceEntities.flatMap((entity) => entity.matches).map((match) => match.matchId));
  const cardLens = (await context.cardLengthRepository.getMany(canidateIds)).reduce<Map<number, number>>(
    (lengths, current) => lengths.set(current.key, current.length),
    new Map(),
  );

  const matchInfo = new Map<number, MatchPair>();
  for (let aIndex = 0; aIndex < sentenceEntities.length; aIndex++) {
    const matches = sentenceEntities[aIndex].matches;
    for (const { matchId, index: bIndex } of matches) {
      if (matchId === cardId) continue;
      if (!matchInfo.has(matchId))
        matchInfo.set(matchId, {
          matchCount: 1,
          a: { cardLen: sentenceEntities.length, min: aIndex, max: aIndex },
          b: { cardLen: cardLens.get(matchId), min: bIndex, max: bIndex },
        });
      else {
        const match = matchInfo.get(matchId);
        match.a.max = aIndex;
        match.b.max = bIndex;
        match.matchCount++;
      }
    }
  }

  const matches: number[] = [];
  for (const [id, info] of matchInfo) if (isMatch(info)) matches.push(id);

  return { matches, existingSentences: canidateIds.includes(cardId) };
}

const loadSentences = async (id: number) => {
  if (!id) return [];
  const card = await db.evidence.findUnique({ where: { id }, select: { id: true, fulltext: true } });
  if (!card?.fulltext) throw new Error(`Card with id ${id} does not exist`);

  return getSentences(card.fulltext);
};

export type Updates = {
  deletes: number[];
  updates: {
    bucketId: number;
    cardIds: number[];
  }[];
};

// Does depth first search for all buckets that a card could have affected
async function getConnectedBuckets(context: RedisContext, visited: Set<SubBucket>, depth: number): Promise<Updates> {
  if (depth > 3) return;

  const visitedCards = new Set([...visited].flatMap((subBucket) => subBucket.members));
  const newMatches = uniq(
    [...visited].flatMap((card) => [...card.matching.keys()]).filter((id) => !visitedCards.has(id)),
  );
  const cardSubBuckets = (await context.cardSubBucketRepository.getMany(newMatches))
    .map((card) => card?.subBucket)
    .filter((el) => el != null);
  const newSubBuckets = uniq(cardSubBuckets).filter((cardSubBucket) => !visited.has(cardSubBucket));
  if (newSubBuckets.length === 0) {
    const bucketSets = uniq(await Promise.all([...visited.values()].map((subBucket) => subBucket.getBucketSet())));
    const updates = await Promise.all(
      bucketSets.map(async (bucketSet) => ({
        bucketId: bucketSet.key,
        cardIds: (await bucketSet.getSubBuckets()).flatMap((subBucket) => subBucket.members),
      })),
    );
    return {
      deletes: [],
      updates,
    };
  } else {
    const newBucketSets = uniq(await Promise.all(newSubBuckets.map(async (subBucket) => subBucket.getBucketSet())));
    await Promise.all(
      newBucketSets.map(async (bucketSet) => {
        for (const subBucket of await bucketSet.getSubBuckets()) visited.add(subBucket);
      }),
    );
    return getConnectedBuckets(context, visited, depth + 1);
  }
}

export async function dedup(id: number, sentences: string[]): Promise<Updates> {
  // If card dosen't have any sentences, just return a bucket with itself
  if (!sentences.length) return { updates: [{ bucketId: id, cardIds: [id] }], deletes: [] };
  // Uses optimisitc locking through WATCH commands to prevent concurrency issues
  // https://redis.io/docs/manual/transactions/#optimistic-locking-using-check-and-set
  try {
    return await redis.executeIsolated(async (client) => {
      const context = new RedisContext(client);
      try {
        const cardSubBucket = (await context.cardSubBucketRepository.get(id))?.subBucket;
        if (cardSubBucket) {
          console.log(context.txId, `Reprocessing ${id}`);
          const subBuckets = new Set(await (await cardSubBucket.getBucketSet()).getSubBuckets());
          return await getConnectedBuckets(context, subBuckets, 1); // await here for error handling
        }

        context.cardLengthRepository.create(id, sentences.length);

        const { existingSentences, matches: matchedCards } = await getMatching(context, id, sentences);
        const cardSubBuckets = await context.cardSubBucketRepository.getMany(matchedCards);
        const bucketCandidates = uniq(cardSubBuckets.map((card) => card?.subBucket)).filter((el) => el);
        bucketCandidates.forEach((b) => b.setMatches(id, matchedCards));
        const matchedBuckets = bucketCandidates.filter((b) => b.doesBucketMatch(matchedCards));

        let addBucket: SubBucket;
        if (!matchedBuckets.length) {
          addBucket = context.subBucketRepository.create(id, matchedCards);
        } else {
          // Add to largest bucket the card matches
          addBucket = maxBy(matchedBuckets, (b) => b.size);
          await addBucket.addCard(id, matchedCards);
        }
        await addBucket.resolve(matchedCards);

        // Only add sentences if they arent already there, prevents duplicates when reprocessing
        if (!existingSentences) {
          const sentenceEntities = await context.sentenceRepository.getMany(sentences);
          sentenceEntities.forEach((entity, i) => entity.addMatch({ matchId: id, index: i }));
        }
        return context.finish();
      } catch (err) {
        // Makes sure unset commands are flushed, gives an uncaught error otherwise
        await context.client.quit();
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof WatchError) return dedup(id, sentences);
    else throw err;
  }
}
