import { Lock } from 'app/lib';
import { SentenceMatch, Sentence, Info, Children } from 'app/lib/redis';
import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';
import { groupBy, map, min, max, uniq } from 'lodash';

const mergeLock: Record<number, Lock> = {};
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

export const getMatching = async (matches: SentenceMatch[][], baseId: number): Promise<number[]> => {
  // Keep index in both cards
  const matchIndexes = matches
    .flatMap((sentence, i) => sentence.map(({ cardId, index }) => ({ cardId, aIndex: i, bIndex: index })))
    .filter((match) => match.cardId !== baseId);

  const matchInfo: MatchPair[] = await Promise.all(
    map(groupBy(matchIndexes, 'cardId'), async (val, key) => ({
      cardId: +key,
      a: { indexes: map(val, 'aIndex'), cardLen: matches.length },
      b: { indexes: map(val, 'bIndex'), cardLen: await Info.get(+key, 'length') },
    })),
  );

  return map(matchInfo.filter(isMatch), 'cardId');
};

export const findParent = async (id: number, text: string): Promise<{ updates: string[]; parent: number }> => {
  let updates = [id.toString()];
  const sentences = getSentences(text) ?? [];

  if (sentences.length) Info.set(id, 'length', sentences.length);
  sentences.forEach((sentence, i) => Sentence.set(sentence, [{ cardId: id, index: i }]));

  // Get matching cards
  const existing = await Promise.all(sentences.map(Sentence.get));
  const filteredMatches = await getMatching(existing, id);
  const matching = await Promise.all(filteredMatches.map((card) => Info.get(card, 'parent')));

  const parent = min(matching) ?? id;
  const toMerge = matching.filter((card) => card && card !== parent);
  const mLock = (mergeLock[parent] = new Lock());

  try {
    // In rare case multiple different parents were matched, merge cards and update parents
    if (toMerge.length) {
      // If cards are being added to a given bucket, wait to merge that bucket
      for (const card of toMerge) await mergeLock[card]?.promise;
      const children = await Promise.all(toMerge.map(Children.get));
      updates = updates.concat(children.flat());
    }
  } catch (e) {
    console.error(e);
  }

  // If lock on parent hasnt been overwritten, unlock it
  if (mergeLock[parent] === mLock) {
    mergeLock[parent]?.unlock();
    delete mergeLock[parent];
  }
  return { updates: uniq(updates), parent };
};
