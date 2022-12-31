import { DynamicKeyEntity, RedisContext, Repository } from './redis';
import { CardSet, SubBucketEntity } from './SubBucket';
import { SHOULD_MERGE } from 'app/constants';
import { WatchError } from 'redis';

// shouldMerge and mergeCardSet are optimized for performance
export function mergeCardSets(subBuckets: readonly CardSet[]): CardSet {
  if (subBuckets.length === 1) return subBuckets[0];
  const matching = new Map<number, number>();
  const members = new Set<number>();
  for (const subBucket of subBuckets) {
    for (const [cardId, count] of subBucket.matching) matching.set(cardId, (matching.get(cardId) ?? 0) + count);
    for (const member of subBucket.members) members.add(member);
  }

  return { size: members.size, members, matching };
}

export function shouldMerge(a: readonly CardSet[], b: readonly CardSet[]): boolean {
  const cardSets = a.concat(b);
  const totalCardSet = mergeCardSets(cardSets);
  return cardSets.every((cardSet) => {
    const otherSetsSize = totalCardSet.size - cardSet.size;

    // Have to try merging in both directions
    let aMergeCount = 0;
    // Try quicker direction first
    for (const member of cardSet.members) {
      // A CardSet wont affect the totalMatching count for its members
      if (SHOULD_MERGE(totalCardSet.matching.get(member), otherSetsSize)) aMergeCount++;
    }
    if (SHOULD_MERGE(aMergeCount, cardSet.size)) return true;

    let bMergeCount = 0;
    for (const member of totalCardSet.members) {
      // Match count will be zero for members of cardSet
      if (SHOULD_MERGE(cardSet.matching.get(member), cardSet.size)) bMergeCount++;
    }
    return SHOULD_MERGE(bMergeCount, otherSetsSize);
  });
}

export type BucketSetEntity = BucketSet;
class BucketSet implements DynamicKeyEntity<number, string[]> {
  private _subBucketIds: Set<number>;
  public key: number;
  constructor(public context: RedisContext, subBucketIds: number[], public updated: boolean = false) {
    this._subBucketIds = new Set(subBucketIds);
    this.key = this.createKey();
  }
  createKey() {
    return Math.min(...this.subBucketIds);
  }
  public async propogateKey() {
    const newKey = this.createKey();
    if (this.key === newKey) return;
    if (this._subBucketIds.size === 0) return this.context.bucketSetRepository.delete(this.key);

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
    // Prevents potential infinte loop when some reads were outdated
    if (bucketSet.subBucketIds.find((id) => this._subBucketIds.has(id))) throw new WatchError();

    this.context.bucketSetRepository.delete(bucketSet.key);
    this._subBucketIds = new Set([...this._subBucketIds, ...bucketSet.subBucketIds]);

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
        // Make sure this wasnt merged into something else
        if ((await this.context.bucketSetRepository.get(this.key)) !== this) return;
        else return this.resolve();
      }
    }
  }

  toRedis() {
    return this.subBucketIds.map(String);
  }
}

export class BucketSetRepository extends Repository<BucketSet, number> {
  protected prefix = 'BS:';

  async fromRedis({ subBucketIds }: { subBucketIds: number[] }): Promise<BucketSet> {
    return new BucketSet(this.context, subBucketIds, true);
  }
  createNew(key: number, subBucketIds: number[]): BucketSet {
    return new BucketSet(this.context, subBucketIds, true);
  }

  protected async load(key: number): Promise<BucketSet> {
    await this.context.client.watch(this.prefix + key);
    const subBuckets = await this.context.client.sMembers(this.prefix + key);
    if (!subBuckets?.length) return this.fromRedis({ subBucketIds: [key] });
    return this.fromRedis({ subBucketIds: subBuckets.map(Number) });
  }
  async save(e: BucketSet): Promise<unknown> {
    e.updated = false;
    this.context.transaction.del(this.prefix + e.key);
    if (e.subBucketIds.length <= 1) return; // Dont bother saving sigle member bucket sets
    return this.context.transaction.sAdd(this.prefix + e.key, e.toRedis());
  }
}
