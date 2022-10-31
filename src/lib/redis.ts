import { createClient, commandOptions } from 'redis';
import { createHash } from 'crypto';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';

export const redis = createClient({
  url: 'redis://redis:6379',
  password: process.env.REDIS_PASSWORD,
  isolationPoolOptions: {
    max: CONCURRENT_DEDUPLICATION,
  },
});
redis.connect();

export type SentenceMatch = { cardId: number; index: number };
export type RedisTransaction = ReturnType<typeof redis['multi']>;
type Table<Key extends unknown[], Value = number> = {
  redisKey: (...args: Key) => string;
  get: (...args: [...Key, typeof redis?]) => Promise<Value>;
  set: (...args: [...Key, Value, RedisTransaction]) => RedisTransaction;
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
  // Uses top 20 bits as bucket, and next 40 as key
  // Will create 65k buckets, each containing a thousand or so sentences with the full dataset.
  return ['s' + hash.slice(0, 5), hash.slice(5, 15)];
};
export const Sentence: Table<[sentence: string], SentenceMatch[]> = {
  redisKey: (sentence) => getSentenceKey(sentence)[0],
  async get(sentence, client = redis) {
    const [bucket, key] = getSentenceKey(sentence);
    const data = await client.get(commandOptions({ returnBuffers: true }), bucket);
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
  set(sentence, matchInfo, transaction) {
    const [bucket, key] = getSentenceKey(sentence);
    const data = matchInfo.map(({ cardId, index }) => key + paddedHex(cardId, 8) + paddedHex(index, 4));
    return transaction.append(bucket, Buffer.from(data.join(''), 'hex'));
  },
};

export const Info: Table<[cardId: number, field: 'parent' | 'length']> = {
  redisKey: (cardId, field) => `i${cardId}`,
  get: (cardId, field, client = redis) => client.hGet(`i${cardId}`, field[0]).then(numOrNull),
  set: (cardId, field, value, transaction) => transaction.hSet(`i${cardId}`, field[0], value),
};

export const Children: Table<[parentId: number], number[]> = {
  redisKey: (parentId) => `c${parentId}`,
  get: (parentId, client = redis) => client.sMembers(`c${parentId}`).then((ids) => ids?.map(Number)),
  set(parentId, childrenIds, transaction) {
    for (const id of childrenIds) {
      Info.set(+id, 'parent', parentId, transaction); // Update card infos with new parent
      transaction.del(`c${parentId}`); // Clear children of things being merged
    }
    return transaction.sAdd(`c${parentId}`, childrenIds.map(String)); // Add cards to parent's child list
  },
};
