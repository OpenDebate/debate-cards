import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';
import { RedisContext, redis } from 'app/modules/deduplicator/redis';
import { db } from 'app/lib';
import { SubBucketEntity } from 'app/modules/deduplicator/SubBucket';
import { WatchError } from 'redis';
import { maxBy, uniq } from 'lodash';

export type SentenceMatch = { matchId: number; index: number };

type MatchInfo = { cardLen: number; min: number; max: number };
type MatchPair = { a: MatchInfo; b: MatchInfo };
export const getSentences = (text: string, cutoff = 20): string[] | undefined => {
  return text
    ?.split(SENTENCE_REGEX)
    .map((el) => el.replace(/[^A-Z]/gi, '').toLowerCase())
    .filter((el: string) => el.length >= cutoff);
};

const checkMatch = (
  { cardLen: aLen, min: aMin, max: aMax }: MatchInfo,
  { cardLen: bLen, min: bMin, max: bMax }: MatchInfo,
) => {
  const insideMatch = aLen > 3 && aLen - (aMax + 1 - aMin) <= INSIDE_TOLERANCE; // If the enterity of A matches
  return insideMatch || (aMin <= EDGE_TOLERANCE && bLen - bMax <= EDGE_TOLERANCE); // If matches the start of A and the end of B
};
// // Check in both orders
const isMatch = (info: MatchPair) => checkMatch(info.a, info.b) || checkMatch(info.b, info.a);

export async function getMatching(
  context: RedisContext,
  cardId: number,
): Promise<{ matches: number[]; existingSentences: boolean }> {
  const sentences = (await loadSentences(cardId)) ?? [];
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
  const cardLens = (await context.cardLengthRepository.getMany(canidateIds)).reduce<Record<number, number>>(
    (prev, current, i) => {
      prev[canidateIds[i]] = current.length;
      return prev;
    },
    {},
  );

  const matchInfo: Record<string, MatchPair> = {};
  for (let aIndex = 0; aIndex < sentenceEntities.length; aIndex++) {
    const matches = sentenceEntities[aIndex].matches;
    for (const { matchId, index: bIndex } of matches) {
      if (matchId === cardId) continue;
      if (!(matchId in matchInfo))
        matchInfo[matchId] = {
          a: { cardLen: sentenceEntities.length, min: aIndex, max: aIndex },
          b: { cardLen: cardLens[matchId], min: bIndex, max: bIndex },
        };
      else {
        matchInfo[matchId].a.max = aIndex;
        matchInfo[matchId].b.max = bIndex;
      }
    }
  }

  const matches: number[] = [];
  for (const id in matchInfo) {
    if (isMatch(matchInfo[id])) matches.push(+id);
  }
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

export async function dedup(id: number, sentences: string[]): Promise<Updates> {
  // If card dosen't have any sentences, just return a bucket with itself
  if (!sentences.length) return { updates: [{ bucketId: id, cardIds: [id] }], deletes: [] };
  // Uses optimisitc locking through WATCH commands to prevent concurrency issues
  // https://redis.io/docs/manual/transactions/#optimistic-locking-using-check-and-set
  try {
    return await redis.executeIsolated(async (client) => {
      const context = new RedisContext(client);
      try {
        context.cardLengthRepository.create(id, sentences.length);

        const { existingSentences, matches: matchedCards } = await getMatching(context, id);
        const cardSubBuckets = await context.cardSubBucketRepository.getMany(matchedCards);
        const bucketCandidates = uniq(cardSubBuckets.map((card) => card?.subBucket)).filter((el) => el);
        bucketCandidates.forEach((b) => b.setMatches(id, matchedCards));
        const matchedBuckets = bucketCandidates.filter((b) => b.doesBucketMatch(matchedCards));

        let addBucket: SubBucketEntity;
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
        context.transaction.discard();
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof WatchError) return dedup(id, sentences);
    else throw err;
  }
}
