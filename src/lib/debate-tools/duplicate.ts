import { redis } from 'app/lib/db';
import { createHash } from 'crypto';
import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';

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

type Table<Key extends unknown[], Value = number> = {
  get: (...args: [...Key]) => Promise<Value>;
  set: (...args: [...Key, Value]) => Promise<unknown>;
};

const numOrNull = (val: any) => (val == null ? null : +val);
export const Sentence: Table<[sentence: string]> = {
  get: (sentence) => redis.hGet(...getSentenceKey(sentence)).then(numOrNull),
  set: (sentence, card) => redis.hSet(...getSentenceKey(sentence), card),
};

export const Info: Table<[cardId: number, field: 'parent' | 'length']> = {
  get: (cardId, field) => redis.hGet(`i${cardId >> 8}`, field[0] + (cardId % 256)).then(numOrNull),
  set: (cardId, field, value) => redis.hSet(`i${cardId >> 8}`, field[0] + (cardId % 256), value),
};

export const Children: Table<[parentId: number], string[]> = {
  get: (parentId) => redis.sMembers(`c${parentId}`),
  set: (parentId, childrenIds) =>
    Promise.all(
      childrenIds
        .map((id) => Info.set(+id, 'parent', parentId)) // Update card infos with new parent
        .concat(redis.sAdd(`c${parentId}`, childrenIds)), // Add cards to parent's child list
    ),
};

type CardMatch = { start: number; end: number };
const isMatch = async ({ start, end }: CardMatch, key: number, cardLength: number) =>
  // If start or end probably real match
  start >= EDGE_TOLERANCE ||
  end >= cardLength - (EDGE_TOLERANCE + 1) ||
  // Otherwise should be entire card inside this one
  end - start - (await Info.get(key, 'length')) <= INSIDE_TOLERANCE;

export const getMatching = async (matches: number[]): Promise<number[]> => {
  // Calculates length of match in case there is a gap due to typo or collision
  const cards: Record<number, CardMatch> = {};
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i];
    if (id === null) continue;
    // If new match, set current index as start and end at end of card, otherwise update end index
    cards[id] ? (cards[id].end = i) : (cards[id] = { start: i, end: matches.length - 1 });
  }

  const matching: number[] = [];
  // Filter out probably false matches
  await Promise.all(
    Object.entries(cards).map(async ([key, value]) => {
      if (await isMatch(value, +key, matches.length)) matching.push(+key);
    }),
  );
  return matching;
};
