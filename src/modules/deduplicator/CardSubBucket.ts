import { BaseEntity, EntityManager, RedisContext } from './redis';
import { SubBucket } from './SubBucket';

class CardSubBucket implements BaseEntity<number, string | undefined> {
  constructor(
    public readonly context: RedisContext,
    public key: number,
    public updated: boolean = false,
    private _subBucket: SubBucket,
  ) {}

  get subBucket() {
    return this._subBucket;
  }
  set subBucket(value) {
    this.updated = true;
    this._subBucket = value;
  }

  toRedis() {
    return this.subBucket?.key.toString();
  }
}
export type { CardSubBucket };

export class CardSubBucketManager implements EntityManager<CardSubBucket, number> {
  public readonly prefix = 'CSB:';
  constructor(public readonly context: RedisContext) {}

  loadKeys(prefixedKeys: string[]): Promise<string[]> {
    this.context.client.watch(prefixedKeys);
    return this.context.client.mGet(prefixedKeys);
  }
  async parse(subBucketId: string, key: number): Promise<CardSubBucket> {
    return new CardSubBucket(this.context, key, false, await this.context.subBucketRepository.get(+subBucketId));
  }
  create(key: number, subBucket: SubBucket): CardSubBucket {
    return new CardSubBucket(this.context, key, true, subBucket);
  }
  save(entity: CardSubBucket): unknown {
    return this.context.transaction.set(this.prefix + entity.key, entity.toRedis());
  }
}
