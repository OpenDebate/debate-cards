import { DynamicKeyEntity, RedisContext, Repository } from './redis';
import { CardSet, SubBucketEntity } from './SubBucket';
import { SHOULD_MERGE } from 'app/constants';
import { WatchError } from 'redis';
import { filter } from 'lodash';

/** Fastest when largest cardSet is first */
export function mergeCardSets(cardSets: readonly CardSet[]): CardSet {
  const matching = new Map(cardSets[0].matching);
  const members = new Set(cardSets[0].members);
  for (const carSet of cardSets.slice(1)) {
    for (const [cardId, count] of carSet.matching) matching.set(cardId, (matching.get(cardId) ?? 0) + count);
    for (const member of carSet.members) members.add(member);
  }

  return { size: members.size, members, matching };
}

function checkAdd(a: CardSet, b: CardSet) {
  const matches = Array.from(a.members).filter((member) => SHOULD_MERGE(b.matching.get(member), b.size));
  return SHOULD_MERGE(matches.length, a.size);
}
/** Faster when small is smaller and large is larger */
function shouldMerge(small: CardSet, large: CardSet) {
  return checkAdd(small, large) || checkAdd(large, small);
}

/**
 * Check if it is possible to build BucketSet one bucket at a time starting from a given cardSet.
 */
function tryBuild(included: CardSet, excluded: readonly CardSet[]) {
  // Does a depth first search, adding one bucket to the included set at a time

  // When only one excluded bucket, if it can be added were done
  if (excluded.length === 1) return shouldMerge(included, excluded[0]);

  const canidates = excluded.filter((cardSet) => shouldMerge(cardSet, included));
  for (const canidate of canidates) {
    if (
      tryBuild(
        mergeCardSets([included, canidate]),
        filter(excluded, (bucket) => bucket !== canidate),
      )
    )
      return true;
  }
  return false;
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
    console.debug(this.context.txId, `Merging ${bucketSet.key} into ${this.key}=>${this.createKey()}`);

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
    console.debug(this.context.txId, `Removing ${subBucket.key} from BucketSet ${this.key}=>${this.createKey()}`);
    await this.propogateKey();

    const newBucketSet = this.context.bucketSetRepository.create(subBucket.key, [subBucket.key]);
    subBucket.bucketSetId = newBucketSet.key;
  }

  async shouldMerge(other: BucketSet): Promise<boolean> {
    const thisSubBuckets = await this.getSubBuckets();
    const otherSubBuckets = await other.getSubBuckets();
    // Technically, a path could exist that this misses, but it is unlikely and very expensive to check
    return (
      tryBuild(mergeCardSets(thisSubBuckets), otherSubBuckets) &&
      tryBuild(mergeCardSets(otherSubBuckets), thisSubBuckets)
    );
  }

  async getRemove(): Promise<SubBucketEntity | null> {
    // Checks if BucketSet could be rebuilt starting from any SubBucket.
    // Number of SubBuckets should stay small, so check can be complex
    // SubBucket with least direct matches that could not be used to rebuild, or null if every subBucket worked

    const subBuckets = await this.getSubBuckets();
    const directMatchList = subBuckets.map((a) => subBuckets.filter((b) => shouldMerge(a, b)));
    // Check the buckets with the least direct matches first
    // They are the most likley to fail and are what we want to return
    const sortedBuckets = subBuckets
      .map((subBucket, i) => ({ subBucket, matchList: directMatchList[i] }))
      .sort((a, b) => a.matchList.length - b.matchList.length);
    for (const { subBucket, matchList } of sortedBuckets) {
      // If a subBucket matches everything, it can just be added to the start of of an existing path
      // If everything matches everything, paths exist anyway
      // Works since shouldMerge(a, c) && shouldMerge(b, c) implies shouldMerge(a+b, c)
      if (matchList.length === subBuckets.length - 1) continue;

      const excluded = subBuckets.filter((b) => b !== subBucket);
      if (!tryBuild(subBucket, excluded)) return subBucket;
    }

    return null;
  }

  async resolve(hasBeenRemove = false): Promise<boolean> {
    if (this._subBucketIds.size <= 1) return hasBeenRemove;
    const removeBucket = await this.getRemove();
    if (!removeBucket) return hasBeenRemove;
    await this.removeSubBucket(removeBucket);
    await this.resolve(true);

    await removeBucket.resolveUpdates([...removeBucket.matching.keys()]);
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
