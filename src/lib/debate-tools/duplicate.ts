import { SentenceMatch, Sentence, Info, Children, redis } from 'app/lib/redis';
import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';
import { groupBy, map, min, max, uniq } from 'lodash';
import { WatchError } from 'redis';

type MatchInfo = { cardLen: number; indexes: number[] };
type MatchPair = { cardId: number; a: MatchInfo; b: MatchInfo };

export const getSentences = (text: string, cutoff = 20): string[] | undefined => {
  return text
    ?.split(SENTENCE_REGEX)
    .map((el) => el.replace(/[^A-Z]/gi, '').toLowerCase())
    .filter((el: string) => el.length >= cutoff);
};

const checkMatch = (a: MatchInfo, b: MatchInfo) =>
  a.cardLen - (min(a.indexes) - max(a.indexes)) <= INSIDE_TOLERANCE || // If the enterity of A matches
  (min(a.indexes) <= EDGE_TOLERANCE && b.cardLen - max(b.indexes) <= EDGE_TOLERANCE); // If matches the start of A and the end of B
// Check in both orders
const isMatch = (info: MatchPair) => checkMatch(info.a, info.b) || checkMatch(info.b, info.a);

export const getMatching = async (matches: SentenceMatch[][], baseId: number, client = redis): Promise<number[]> => {
  // Keep index in both cards
  const matchIndexes = matches
    .flatMap((sentence, i) => sentence.map(({ cardId, index }) => ({ cardId, aIndex: i, bIndex: index })))
    .filter((match) => match.cardId !== baseId);

  const matchInfo: MatchPair[] = await Promise.all(
    map(groupBy(matchIndexes, 'cardId'), async (val, key) => ({
      cardId: +key,
      a: { indexes: map(val, 'aIndex'), cardLen: matches.length },
      b: { indexes: map(val, 'bIndex'), cardLen: await Info.get(+key, 'length', client) },
    })),
  );

  return map(matchInfo.filter(isMatch), 'cardId');
};

export const dedup = async (id: number, sentences: string[]): Promise<{ rootId: number; evidenceIds: number[] }> => {
  let evidenceIds = [id];
  let rootId = id;
  if (!sentences.length) return { rootId, evidenceIds };
  // Uses optimisitc locking through WATCH commands to prevent concurrency issues
  // https://redis.io/docs/manual/transactions/#optimistic-locking-using-check-and-set
  try {
    await redis.executeIsolated(async (client) => {
      /* 
        Watch for change in sentences, prevents new card being added that this card should match and it being missed
        Will have a decent amonunt of false positives due to bucketing of sentences
        Probability a card completes without a retry is roughly
        (1 - ((sentencesPerCard * concurrentDeduplication) / numBuckets))^sentencesPerCard
        sentencesPerCard seems to be roughly 30
        With 25 concurrent deduplications happening, and 2^20 buckets, probability is around 0.98
      */
      await client.watch(sentences.map(Sentence.redisKey));
      // Get matching cards
      const matches = await Promise.all(sentences.map((s) => Sentence.get(s, client)));
      const filteredMatches = await getMatching(matches, id, client); // Lengths never change so no need to watch
      if (filteredMatches.length) {
        // Watch for change in parent of matching cards
        await client.watch(filteredMatches.map((match) => Info.redisKey(match, 'parent')));
        // Get parents of matches
        const parents = uniq(await Promise.all(filteredMatches.map((card) => Info.get(card, 'parent', client))));
        rootId = min(parents) ?? id;

        /*
         Prevents merging into a bucket that got merged into something else and had its children reset
         Prevents merging child that just had evidence added to it and missing the additions
        */
        await client.watch(parents.map(Children.redisKey));
        const children = await Promise.all(parents.map(async (parent) => Children.get(parent, client)));
        evidenceIds = uniq(evidenceIds.concat(parents, children.flat()));
      }

      const transaction = client.multi();
      if (sentences.length) Info.set(id, 'length', sentences.length, transaction);
      sentences.forEach((sentence, i) => Sentence.set(sentence, [{ cardId: id, index: i }], transaction));
      Children.set(rootId, evidenceIds, transaction);

      return transaction.exec();
    });
  } catch (err) {
    if (err instanceof WatchError)
      return dedup(id, sentences); // If watch error retry, only happens a few percent of the time
    else throw err;
  }
  return { rootId, evidenceIds };
};
