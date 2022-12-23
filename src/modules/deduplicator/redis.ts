import { createClient } from 'redis';
import { isEmpty, uniq } from 'lodash';

export const redis = createClient({
  url: 'redis://redis:6379',
  password: 'password',
  isolationPoolOptions: { max: 10 },
});

export type RedisType = typeof redis;
export type RedisTransaction = ReturnType<RedisType['multi']>;

export interface BaseEntity<K extends string | number, V = Record<string, string>> {
  context: RedisContext;
  updated: boolean;
  key: K;
  toRedis(): V;
}

export interface DynamicKeyEntity<K extends string | number, V = Record<string, string>> extends BaseEntity<K, V> {
  createKey(): K;
  propogateKey(): Promise<unknown>;
}

export abstract class Repository<E extends BaseEntity<string | number, unknown>, K extends string | number> {
  protected cache: Map<K, E | Promise<E>>;
  protected abstract prefix: string;
  public deletions: Set<K>;

  constructor(protected context: RedisContext) {
    this.cache = new Map();
    this.deletions = new Set();
  }

  protected getKeys(keys: K[]): Promise<Record<string, string>[]> {
    this.context.client.watch(keys.filter((key) => !this.cache.has(key)).map(String));
    return Promise.all(keys.map((key) => this.context.client.hGetAll(`${this.prefix}${key}`)));
  }
  protected async getKey(key: K) {
    const obj = (await this.getKeys([key]))[0];
    return isEmpty(obj) ? null : obj;
  }
  protected async load(key: K) {
    const obj = await this.getKey(key);
    if (isEmpty(obj)) return null;
    const entity = this.fromRedis(obj, key);
    if (!entity) return null;
    this.cache.set(key, entity);
    return entity;
  }
  public async get(key: K): Promise<E> | null {
    // Add to cache right away so concurrent requests get the same object
    if (!this.cache.has(key)) this.cache.set(key, this.load(key));
    return this.cache.get(key);
  }
  public async getMany(keys: readonly K[]): Promise<(E | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }
  public async getUpdated(): Promise<E[]> {
    return (await Promise.all(this.cache.values())).filter((e) => e?.updated);
  }

  abstract fromRedis(obj: Record<string, unknown>, key: K): E | Promise<E>;
  abstract createNew(key: K, ...args: any[]): E;
  public create(key: K, ...args: any[]) {
    const entity = this.createNew(key, ...args);
    this.cache.set(key, entity);
    return entity;
  }

  public async renameCacheKey(oldKey: K, newKey: K) {
    const value = this.cache.get(oldKey);
    this.cache.set(newKey, value);
    this.cache.delete(oldKey);
    this.context.transaction.del(this.prefix + oldKey);
  }
  public delete(key: K) {
    this.cache.set(key, null);
    this.deletions.add(key);
  }

  public async save(e: E): Promise<unknown> {
    e.updated = false;
    const key = e.key.toString();
    return Object.entries(await e.toRedis()).map(
      ([subKey, value]) => value && this.context.transaction.hSet(`${this.prefix}${key}`, subKey, value),
    );
  }
  public async saveAll() {
    const updated = await this.getUpdated();
    for (const key of this.deletions) this.context.transaction.del(this.prefix + key);
    this.deletions = new Set();
    return Promise.all(updated.map((entity) => this.save(entity)));
  }
}

import { SubBucketRepository } from './SubBucket';
import { CardSubBucketRepository } from './CardSubBucket';
import { SentenceRepository } from './Sentence';
import { CardLengthRepository } from './CardLength';
import { BucketSetRepository } from './BucketSet';
import { Updates } from 'app/lib/debate-tools/duplicate';

export class RedisContext {
  transaction: RedisTransaction;
  sentenceRepository: SentenceRepository;
  cardLengthRepository: CardLengthRepository;
  cardSubBucketRepository: CardSubBucketRepository;
  subBucketRepository: SubBucketRepository;
  bucketSetRepository: BucketSetRepository;

  constructor(public client: RedisType) {
    this.transaction = client.multi();
    this.sentenceRepository = new SentenceRepository(this);
    this.cardLengthRepository = new CardLengthRepository(this);
    this.cardSubBucketRepository = new CardSubBucketRepository(this);
    this.subBucketRepository = new SubBucketRepository(this);
    this.bucketSetRepository = new BucketSetRepository(this);
  }

  async finish(): Promise<Updates> {
    // Updates for postgres database
    // BucketSets that were updated, or a SubBucket in them was updated
    let updatedBucketSets = await this.bucketSetRepository.getMany(
      (await this.subBucketRepository.getUpdated()).map((subBucket) => subBucket.bucketSetId),
    );
    updatedBucketSets = updatedBucketSets.concat(await this.bucketSetRepository.getUpdated());
    updatedBucketSets = uniq(updatedBucketSets);
    const deletedBucketSets = this.bucketSetRepository.deletions;

    const deletes = updatedBucketSets
      .filter((bucketSet) => bucketSet.originalKey !== bucketSet.key)
      .map((bucket) => bucket.originalKey)
      .concat([...deletedBucketSets]);
    const updates: Updates = {
      deletes,
      updates: await Promise.all(
        updatedBucketSets.map(async (bucketSet) => ({
          bucketId: bucketSet.key,
          cardIds: (await bucketSet.getSubBuckets()).flatMap((bucket) => bucket?.members),
        })),
      ),
    };

    await this.subBucketRepository.saveAll();
    await this.cardLengthRepository.saveAll();
    await this.cardSubBucketRepository.saveAll();
    await this.sentenceRepository.saveAll();
    await this.bucketSetRepository.saveAll();

    await this.transaction.exec();
    return updates;
  }
}
