import { toPairs } from 'lodash';
import { redis } from 'app/lib/db';
import { createHash } from 'crypto';
import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';

type CardMatches = Record<number, { start: number; end: number }>;
export interface DedupTask {
  text: string;
  id: number;
  callback: (value: unknown) => void;
}

export const getSentences = (text: string, cutoff = 20): string[] | undefined => {
  return text
    ?.split(SENTENCE_REGEX)
    .map((el) => el.replace(/[^A-Z]/gi, '').toLowerCase())
    .filter((el: string) => el.length >= cutoff);
};

/* 
  Small hashes are stored in a memory efficient way in redis
  Storing data in buckets using hashes drastically reduces the overhead of storing each value
  https://redis.io/topics/memory-optimization
*/
const getSentenceKey = (sentence: string): [string, string] => {
  const hash = createHash('md5').update(sentence).digest('base64');
  // Uses top 18 bits as bucket, and next 36 as key
  // Will create around 260k buckets, each containing a few hundred items with the full dataset
  return ['s' + hash.slice(0, 3), hash.slice(3, 9)];
};
export const Sentence = {
  get: (sentence: string): Promise<string> => redis.hGet(...getSentenceKey(sentence)),
  set: (sentence: string, card: number): Promise<number> => redis.hSet(...getSentenceKey(sentence), card),
};

export const Info = {
  get: (cardId: number, field: 'p' | 'l'): Promise<string> => redis.hGet(`i${cardId >> 8}`, field + (cardId % 256)),
  set: (cardId: number, field: 'p' | 'l', value: string | number): Promise<number> =>
    redis.hSet(`i${cardId >> 8}`, field + (cardId % 256), value),
};

export const setRedisParents = (cardIds: string[], parentId: number): Promise<number>[] =>
  cardIds
    .map((id) => Info.set(+id, 'p', parentId.toString())) // Update card infos with new parent
    .concat(redis.sAdd(`c${parentId}`, cardIds)); // Add cards to parent's child list
export const getChildren = (cardId: string): Promise<string[]> => redis.sMembers(`c${cardId}`) ?? Promise.resolve([]);

export const getMatching = async (matches: (string | null)[]): Promise<(string | false)[]> => {
  // If no matches
  if (!matches.find((el) => el !== null)) return null;

  // Calculates length of match in case there is a gap due to typo or collision
  const cards: CardMatches = {};
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i];
    if (id === null) continue;
    // If new match, set current index as start and end at end of card, otherwise update end index
    cards[id] ? (cards[id].end = i) : (cards[id] = { start: i, end: matches.length - 1 });
  }

  // Filter out probably false matches
  return Promise.all(
    toPairs(cards).map(async ([key, value]) => {
      const { start, end } = value;
      // If match starts at start or ends at end it is probably a real match
      if (start >= EDGE_TOLERANCE || end >= matches.length - (EDGE_TOLERANCE + 1)) return key;
      // If dosent reach start or end, it should be the entire card inside this one
      return end - start - +(await Info.get(+key, 'l')) <= INSIDE_TOLERANCE && key;
    }),
  );
};
