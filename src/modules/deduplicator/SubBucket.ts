import { intersection } from 'lodash';
import { getMatching } from 'app/lib/debate-tools/duplicate';
import { DynamicKeyEntity, EntityManager, RedisContext } from './redis';
import { SHOULD_MATCH } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import { db } from 'app/lib';

export interface CardSet {
  size: number;
  members: Iterable<number>;
  matching: ReadonlyMap<number, number>;
}

class SubBucket implements DynamicKeyEntity<number, Record<string, string>>, CardSet {
  public key: number;
  constructor(
    public readonly context: RedisContext,
    private readonly _cards: Map<number, number>,
    private readonly _matching: Map<number, number>,
    private _bucketSetId: number,
    public updated: boolean = false,
  ) {
    this.key = this.createKey();
  }

  public createKey(): number {
    return Math.min(...this.cards.keys());
  }

  public async propogateKey() {
    const newKey = this.createKey();
    if (newKey === this.key) return;

    const cards = await this.getCards();
    if (cards.length === 0) {
      await (await this.getBucketSet()).removeSubBucket(this);
      return this.context.subBucketRepository.delete(this.key);
    }

    cards.forEach((card) => (card.updated = true)); // Has reference to this, so key gets updated on save
    this.context.subBucketRepository.renameCacheKey(this.key, newKey);
    (await this.getBucketSet()).renameSubBucket(this.key, newKey);
    this.key = newKey;
  }

  get members(): number[] {
    return [...this.cards.keys()];
  }
  get size(): number {
    return this.cards.size;
  }

  /** Map of cardIds in bucket to how many cards in the bucket they match */
  get cards(): ReadonlyMap<number, number> {
    return this._cards;
  }
  /** Map of cardIds not in bucket to how many cards in the bucket they match */
  get matching(): ReadonlyMap<number, number> {
    return this._matching;
  }

  get bucketSetId() {
    return this._bucketSetId;
  }

  set bucketSetId(value: number) {
    this.updated = true;
    this._bucketSetId = value;
  }

  async getCards() {
    return this.context.cardSubBucketRepository.getMany(this.members);
  }

  async getBucketSet() {
    return this.context.bucketSetRepository.get(this._bucketSetId);
  }

  doesBucketMatch(matches: number[]) {
    return SHOULD_MATCH(intersection(matches, this.members).length, this.size);
  }

  setMatches(id: number, matches: number[]) {
    this.updated = true;
    this._matching.set(id, intersection(this.members, matches).length);
  }

  async addCard(id: number, matches: number[]) {
    this._matching.delete(id);
    if (this.cards.has(id)) return;

    this.updated = true;
    // Update match counts
    this._cards.set(id, 1);
    for (const match of matches) {
      if (this.cards.has(match)) {
        this._cards.set(id, this.cards.get(id) + 1);
        this._cards.set(match, this.cards.get(match) + 1);
      } else this._matching.set(match, (this.matching.get(match) ?? 0) + 1);
    }
    this.context.cardSubBucketRepository.create(id, this);
    return this.propogateKey();
  }

  async removeCard(id: number) {
    this.updated = true;
    this._cards.delete(id);
    console.debug(`Removing ${id} from SubBucket ${this.key}=>${this.createKey()}`);
    this.context.cardSubBucketRepository.delete(id);

    for (const match of (await getMatching(this.context, id)).matches) {
      const counter = this.cards.has(match) ? this._cards : this._matching;
      if (counter.get(match) <= 1) counter.delete(match);
      else counter.set(match, counter.get(match) - 1);
    }

    // Add card back to processing queue in case it should match a different bucket
    const { gid } = await db.evidence.findUnique({ where: { id }, select: { gid: true } });
    onAddEvidence.emit({ gid });

    return this.propogateKey();
  }

  async resolveUpdates(canidates: readonly number[]): Promise<void> {
    const thisBucketSet = await this.getBucketSet();
    const canidateSubBuckets = (await this.context.cardSubBucketRepository.getMany(canidates))
      .filter((s) => s?.subBucket)
      .map((s) => s.subBucket)
      .filter((subBucket) => subBucket.bucketSetId != this.bucketSetId);
    const canidateBucketSets = new Set(
      await Promise.all(canidateSubBuckets.map((subBucket) => subBucket.getBucketSet())),
    );

    for (const bucketSet of canidateBucketSets) {
      if (await thisBucketSet.shouldMerge(bucketSet)) {
        await thisBucketSet.merge(bucketSet);
        return this.resolveUpdates([...this.matching.keys()]); // Anything might match now
      }
    }
  }

  private async resolveRemoves(hasBeenRemove = false) {
    for (const [cardId, count] of this.cards) {
      if (!SHOULD_MATCH(count, this.size)) {
        await this.removeCard(cardId);
        return this.resolveRemoves(true);
      }
    }
    return hasBeenRemove;
  }

  async resolve(updates: readonly number[]) {
    const cardWasRemoved = await this.resolveRemoves();
    const bucketWasRemoved = await (await this.getBucketSet()).resolve();

    // If something was removed, anything might match now, otherwise must come from a card with a match added
    const canidates =
      cardWasRemoved || bucketWasRemoved ? [...this.matching.keys()] : updates.filter((id) => this.matching.has(id));

    await this.resolveUpdates(canidates);
    await this.propogateKey();
  }

  toRedis() {
    const obj: Record<string, string> = { bs: this._bucketSetId.toString() };
    for (const [cardId, count] of this.cards) obj[`c${cardId}`] = count.toString();
    for (const [matchId, count] of this.matching) obj[`m${matchId}`] = count.toString();
    return obj;
  }
}
export type { SubBucket };

export class SubBucketManager implements EntityManager<SubBucket, number> {
  public readonly prefix = 'SB:';
  constructor(public readonly context: RedisContext) {}

  loadKeys(prefixedKeys: string[]): Promise<Record<string, string>[]> {
    this.context.client.watch(prefixedKeys);
    return Promise.all(prefixedKeys.map((key) => this.context.client.hGetAll(key)));
  }
  parse(loadedValue: Record<string, string>, key: number): SubBucket {
    const cards: Map<number, number> = new Map();
    const matches: Map<number, number> = new Map();
    let bucketSetId = key;
    for (const key in loadedValue) {
      const [type, id] = [key.charAt(0), +key.slice(1)];
      const value = +loadedValue[key];
      if (type === 'c') cards.set(id, value);
      else if (type === 'm') matches.set(id, value);
      else if (key === 'bs') bucketSetId = value;
      else throw new Error(`Invalid key ${key} loading SubBucket`);
    }
    return new SubBucket(this.context, cards, matches, bucketSetId, false);
  }
  create(root: number, matches: number[]): SubBucket {
    const cards = new Map([[root, 1]]);
    const matchMap = new Map(matches.map((match) => [match, 1]));
    const subBucket = new SubBucket(this.context, cards, matchMap, root, true);
    this.context.cardSubBucketRepository.create(root, subBucket);
    return subBucket;
  }
  save(entity: SubBucket): unknown {
    const key = this.prefix + entity.key;
    this.context.transaction.del(key);
    return Object.entries(entity.toRedis()).map(
      ([subKey, value]) => value && this.context.transaction.hSet(key, subKey, value),
    );
  }
}
