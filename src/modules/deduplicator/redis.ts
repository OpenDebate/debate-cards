import { createClient } from 'redis';
import { isEmpty, uniq } from 'lodash';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';

export const redis = createClient({
  url: 'redis://redis:6379',
  password: 'password',
  isolationPoolOptions: { max: CONCURRENT_DEDUPLICATION },
});

export type RedisType = typeof redis;
export type RedisTransaction = ReturnType<RedisType['multi']>;

export interface BaseEntity<K extends string | number, V> {
  readonly context: RedisContext;
  updated: boolean;
  key: K;
  toRedis(): V;
}

export interface DynamicKeyEntity<K extends string | number, V> extends BaseEntity<K, V> {
  createKey(): K;
  propogateKey(): Promise<unknown>;
}

export interface EntityManager<E extends BaseEntity<string | number, unknown>, K extends string | number> {
  readonly context: RedisContext;
  readonly prefix: string;
  loadKeys(prefixedKeys: string[], rawKeys: string[]): Promise<unknown[]>;
  parse(loadedValue: unknown, key: K): E | Promise<E>;
  create(key: K, ...args: any[]): E;
  save(entity: E): unknown;
}

export class Repository<E extends BaseEntity<string | number, unknown>, K extends string | number> {
  private cache: Map<K, E | Promise<E>>;
  private _deletions: Set<K>;

  constructor(private entityMangaer: EntityManager<E, K>) {
    this.cache = new Map();
    this._deletions = new Set();
  }

  get deletions(): ReadonlySet<K> {
    return this._deletions;
  }

  public getMany(keys: readonly K[]): Promise<(E | null)[]> {
    const notInCache = keys.filter((key) => !this.cache.has(key));
    const prefixedKeys = notInCache.map((key) => this.entityMangaer.prefix + key);
    if (prefixedKeys.length) {
      const loadValues = this.entityMangaer.loadKeys(prefixedKeys, notInCache.map(String));

      notInCache.forEach((key, i) =>
        this.cache.set(
          key,
          loadValues.then((result) => {
            const value = result[i];
            if (value === null) return null;
            return this.entityMangaer.parse(value, key);
          }),
        ),
      );
    }
    return Promise.all(keys.map((key) => this.cache.get(key)));
  }
  public async get(key: K) {
    return (await this.getMany([key]))[0];
  }

  public async getUpdated(): Promise<E[]> {
    return (await Promise.all(this.cache.values())).filter((e) => e?.updated);
  }

  public create(key: K, ...args: any[]): E {
    this.entityMangaer.context.client.watch(this.entityMangaer.prefix + key);
    const entity = this.entityMangaer.create(key, ...args);
    this.cache.set(key, entity);
    return entity;
  }

  public delete(key: K): void {
    this.cache.set(key, null);
    this._deletions.add(key);
  }
  public renameCacheKey(oldKey: K, newKey: K): void {
    this.cache.set(newKey, this.cache.get(oldKey));
    this.delete(oldKey);
  }

  public save(e: E): unknown {
    e.updated = false;
    return this.entityMangaer.save(e);
  }
  public async saveAll(): Promise<unknown> {
    const updated = await this.getUpdated();
    for (const key of this._deletions) this.entityMangaer.context.transaction.del(this.entityMangaer.prefix + key);
    this._deletions = new Set();
    return updated.map((entity) => this.save(entity));
  }
}

import { Sentence, SentenceManager } from './Sentence';
import { SubBucket, SubBucketManager } from './SubBucket';
import { CardSubBucket, CardSubBucketManager } from './CardSubBucket';
import { CardLength, CardLengthManager } from './CardLength';
import { BucketSet, BucketSetManager } from './BucketSet';
import { Updates } from 'app/lib/debate-tools/duplicate';

let i = 0;
export class RedisContext {
  transaction: RedisTransaction;
  sentenceRepository: Repository<Sentence, string>;
  cardLengthRepository: Repository<CardLength, number>;
  cardSubBucketRepository: Repository<CardSubBucket, number>;
  subBucketRepository: Repository<SubBucket, number>;
  bucketSetRepository: Repository<BucketSet, number>;
  txId: number; // For logging/debugging

  constructor(public client: RedisType) {
    this.transaction = client.multi();
    this.sentenceRepository = new Repository(new SentenceManager(this));
    this.cardLengthRepository = new Repository(new CardLengthManager(this));
    this.cardSubBucketRepository = new Repository(new CardSubBucketManager(this));
    this.subBucketRepository = new Repository(new SubBucketManager(this));
    this.bucketSetRepository = new Repository(new BucketSetManager(this));
    this.txId = i++;
  }

  async finish(): Promise<Updates> {
    // Updates for postgres database
    // BucketSets that were updated, or a SubBucket in them was updated
    let updatedBucketSets = await this.bucketSetRepository.getMany(
      (await this.subBucketRepository.getUpdated()).map((subBucket) => subBucket.bucketSetId),
    );
    updatedBucketSets = updatedBucketSets.concat(await this.bucketSetRepository.getUpdated());
    updatedBucketSets = uniq(updatedBucketSets);

    const updates = await Promise.all(
      updatedBucketSets.map(async (bucketSet) => ({
        bucketId: bucketSet.key,
        cardIds: (await bucketSet.getSubBuckets()).flatMap((bucket) => bucket?.members),
      })),
    );
    const updateIds = updates.map((update) => update.bucketId);
    const deletes = [...this.bucketSetRepository.deletions].filter((id) => !updateIds.includes(id));

    await this.subBucketRepository.saveAll();
    await this.cardLengthRepository.saveAll();
    await this.cardSubBucketRepository.saveAll();
    await this.sentenceRepository.saveAll();
    await this.bucketSetRepository.saveAll();

    await this.transaction.exec();
    return { deletes: uniq(deletes), updates };
  }
}
