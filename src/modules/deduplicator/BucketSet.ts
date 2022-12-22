import { union } from 'lodash';
import { DynamicKeyEntity, RedisContext, Repository } from './redis';
import { CardSet, SubBucketEntity } from './SubBucket';
import { SHOULD_MERGE } from 'app/constants';

export function toCardSet(subBuckets: readonly SubBucketEntity[]): CardSet {
  const matching = subBuckets.reduce((acc, cur) => {
    for (const [cardId, count] of cur.matching) acc.set(cardId, (acc.get(cardId) ?? 0) + count);
    return acc;
  }, new Map<number, number>());
  const members = union(...subBuckets.map((b) => b.members));
  return { size: members.length, members, matching };
}

function checkAdd(a: CardSet, b: CardSet) {
  const matches = b.members.filter((cardId) => SHOULD_MERGE(a.matching.get(cardId), a.size));
  return SHOULD_MERGE(matches.length, b.size);
}

export function shouldMerge(a: readonly SubBucketEntity[], b: readonly SubBucketEntity[]) {
  return checkAdd(toCardSet(a), toCardSet(b));
}

export type BucketSetEntity = BucketSet;
class BucketSet implements DynamicKeyEntity<number, string[]> {
  private _subBucketIds: Set<number>;
  public key: number;
  public readonly originalKey: number;
  constructor(public context: RedisContext, subBucketIds: number[], public updated: boolean = false) {
    this._subBucketIds = new Set(subBucketIds);
    this.originalKey = this.key = this.createKey();
  }
  createKey() {
    return Math.min(...this.subBucketIds);
  }
  public async propogateKey() {
    const newKey = this.createKey();
    if (this.key === newKey) return;
    const subBuckets = await this.getSubBuckets();
    subBuckets.forEach((subBucket) => (subBucket.bucketSetId = newKey)); // Have to explicitly set
    this.context.bucketSetRepository.renameCacheKey(this.key, newKey);
    this.key = newKey;
  }

  get subBucketIds(): readonly number[] {
    return [...this._subBucketIds];
  }

  async getSubBuckets(): Promise<readonly SubBucketEntity[]> {
    return this.context.subBucketRepository.getMany(this.subBucketIds);
  }

  async merge(bucketSet: BucketSet) {
    this.updated = true;
    this.context.bucketSetRepository.delete(bucketSet.key);

    this._subBucketIds = new Set([...this._subBucketIds, ...bucketSet.subBucketIds]);
    bucketSet.updated = true;
    bucketSet._subBucketIds = new Set();

    (await this.getSubBuckets()).forEach((subBucket) => (subBucket.bucketSetId = this.key));
    return this.propogateKey();
  }

  async renameSubBucket(oldKey: number, newKey: number): Promise<void> {
    this.updated = true;
    this._subBucketIds.delete(oldKey);
    this._subBucketIds.add(newKey);
    return this.propogateKey();
  }

  async removeSubBucket(subBucket: SubBucketEntity) {
    this.updated = true;
    this._subBucketIds.delete(subBucket.key);
    await this.propogateKey();

    const newBucketSet = this.context.bucketSetRepository.create(subBucket.key, [subBucket.key]);
    subBucket.bucketSetId = newBucketSet.key;

    await subBucket.resolveUpdates([...subBucket.matching.keys()]);
  }

  async resolve(): Promise<void> {
    if (this._subBucketIds.size <= 1) return;
    const subBuckets = await this.getSubBuckets();
    for (const subBucket of subBuckets) {
      // Check if bucket would still get added if you tried now
      if (
        !shouldMerge(
          subBuckets.filter((b) => b !== subBucket),
          [subBucket],
        )
      ) {
        await this.removeSubBucket(subBucket);
        return this.resolve();
      }
    }
  }

  toRedis() {
    return this.subBucketIds.map(String);
  }
}

export class BucketSetRepository extends Repository<BucketSet, number> {
  protected prefix = 'BS:';

  async fromRedis({ subBucketIds }: { subBucketIds: number[] }) {
    return new BucketSet(this.context, subBucketIds, true);
  }
  createNew(key: number, subBucketIds: number[]) {
    return new BucketSet(this.context, subBucketIds, true);
  }

  protected async load(key: number): Promise<BucketSet> {
    await this.context.client.watch(this.prefix + key);
    const subBuckets = await this.context.client.sMembers(this.prefix + key);
    if (!subBuckets?.length) return this.fromRedis({ subBucketIds: [key] });
    return this.fromRedis({ subBucketIds: subBuckets.map(Number) });
  }
  async save(e: BucketSet) {
    e.updated = false;
    this.context.transaction.del(this.prefix + e.originalKey);
    if (e.subBucketIds.length <= 1) return; // Dont bother saving sigle member bucket sets
    return this.context.transaction.sAdd(this.prefix + e.key, e.toRedis());
  }
}
