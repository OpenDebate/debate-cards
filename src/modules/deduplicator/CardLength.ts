import { BaseEntity, EntityManager, RedisContext } from './redis';

class CardLength implements BaseEntity<number, string> {
  constructor(
    public readonly context: RedisContext,
    public key: number,
    public updated: boolean = false,
    public readonly length: number,
  ) {}
  toRedis() {
    return this.length.toString();
  }
}
export type { CardLength };

export class CardLengthManager implements EntityManager<CardLength, number> {
  public readonly prefix = 'CL:';
  constructor(public readonly context: RedisContext) {}

  loadKeys(prefixedKeys: string[]): Promise<string[]> {
    this.context.client.watch(prefixedKeys);
    return this.context.client.mGet(prefixedKeys);
  }
  parse(length: string, key: number): CardLength {
    return new CardLength(this.context, key, false, +length);
  }
  create(key: number, length: number): CardLength {
    return new CardLength(this.context, key, true, length);
  }
  save(entity: CardLength): unknown {
    return this.context.transaction.set(this.prefix + entity.key, entity.toRedis());
  }
}
