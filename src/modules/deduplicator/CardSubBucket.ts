import { BaseEntity, RedisContext, Repository } from './redis';
import { SubBucketEntity } from './SubBucket';

class CardSubBucket implements BaseEntity<number> {
  constructor(
    public context: RedisContext,
    public key: number,
    public updated: boolean = false,
    private _subBucket: SubBucketEntity,
  ) {}

  get subBucket() {
    return this._subBucket;
  }
  set subBucket(value) {
    this.updated = true;
    this._subBucket = value;
  }

  toRedis() {
    return { sb: this.subBucket?.key.toString() };
  }
}

export class CardSubBucketRepository extends Repository<CardSubBucket, number> {
  protected prefix = 'C:';

  async fromRedis(obj: { sb: string }, key: number): Promise<CardSubBucket> {
    if (!obj.sb) return null;
    return new CardSubBucket(this.context, key, false, await this.context.subBucketRepository.get(+obj.sb));
  }
  createNew(key: number, subBucket: SubBucketEntity): CardSubBucket {
    return new CardSubBucket(this.context, key, true, subBucket);
  }

  async reset(key: number): Promise<void> {
    this.context.transaction.hDel(this.prefix + key, 'sb');
    const entity = await this.get(key);
    if (entity) entity.subBucket = null;
  }
}
