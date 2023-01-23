import { createClient, commandOptions } from 'redis';
import { createHash } from 'crypto';

export const redis = createClient({
  url: 'redis://redis:6379',
  password: process.env.REDIS_PASSWORD,
});
redis.connect();

export type SentenceMatch = { cardId: number; index: number };
type Table<Key extends unknown[], Value = number> = {
  get: (...args: [...Key]) => Promise<Value>;
  set: (...args: [...Key, Value]) => Promise<unknown>;
};

const numOrNull = (val: any) => (val == null ? null : +val);
const paddedHex = (num: number, len: number) => num.toString(16).padStart(len, '0');
/*
  Data about sentences is stored inside binary strings
  Sentences are split into buckets so the performances is reasonable
  Each bucket contains a sequence of 11 byte blocks containing information
  First 5 bytes are the key of the sentence within the bucket, Next 4 bytes are card id, Last 2 bytes are index of sentence in card
*/
const getSentenceKey = (sentence: string): [string, string] => {
  const hash = createHash('md5').update(sentence).digest('hex');
  // Uses top 16 bits as bucket, and next 40 as key
  // Will create 65k buckets, each containing a thousand or so sentences with the full dataset.
  return ['s' + hash.slice(0, 4), hash.slice(4, 14)];
};
export const Sentence: Table<[sentence: string], SentenceMatch[]> = {
  async get(sentence) {
    const [bucket, key] = getSentenceKey(sentence);
    const data = await redis.get(commandOptions({ returnBuffers: true }), bucket);
    if (!data) return [];
    if (data.length % 11 != 0) throw new Error(`Data for bucket ${bucket} has invalid length of ${data.length}`);

    // Loop through all sentences in bucket and ignore the ones with a different key
    const matches: SentenceMatch[] = [];
    for (let i = 0; i < data.length; i += 11) {
      if (data.readUIntBE(i, 5) != parseInt(key, 16)) continue;
      matches.push({ cardId: data.readUIntBE(i + 5, 4), index: data.readUIntBE(i + 9, 2) });
    }
    return matches;
  },
  async set(sentence, matchInfo) {
    const [bucket, key] = getSentenceKey(sentence);
    const data = matchInfo.map(({ cardId, index }) => key + paddedHex(cardId, 8) + paddedHex(index, 4));
    return redis.append(bucket, Buffer.from(data.join(''), 'hex'));
  },
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
