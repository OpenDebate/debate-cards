import { createHash } from 'crypto';
import { commandOptions } from 'redis';
import { SentenceMatch } from 'app/lib/debate-tools/duplicate';
import { BaseEntity, EntityManager, RedisContext } from './redis';

/*
  Data about sentences is stored inside binary strings
  Sentences are split into buckets so the performances is reasonable
  Each bucket contains a sequence of 11 byte blocks containing information
  First 5 bytes are the key of the sentence within the bucket, Next 4 bytes are card id, Last 2 bytes are index of sentence in card
*/
const paddedHex = (num: number, len: number) => num.toString(16).padStart(len, '0');
class Sentence implements BaseEntity<string, string> {
  public readonly key: string;
  public readonly subKey: string;
  private _additions: SentenceMatch[];
  constructor(
    public readonly context: RedisContext,
    public readonly sentence: string,
    private _loadedMatches: SentenceMatch[],
    public updated: boolean = false,
  ) {
    const { bucket, subKey } = Sentence.createKey(sentence);
    this.key = bucket;
    this.subKey = subKey;
    this._additions = [];
  }

  static createKey(sentence: string) {
    const hash = createHash('md5').update(sentence).digest('hex');
    // Uses top 20 bits as bucket, and next 40 as key
    // Will create around 1 million buckets, each containing 100 or so sentences with the full dataset.
    return { bucket: hash.slice(0, 5), subKey: hash.slice(5, 15) };
  }

  get matches(): readonly SentenceMatch[] {
    return this._loadedMatches.concat(this._additions);
  }

  get additions(): readonly SentenceMatch[] {
    return this._additions;
  }

  addMatch(match: SentenceMatch) {
    this.updated = true;
    this._additions.push(match);
  }

  toRedis() {
    return this._additions
      .map(({ matchId, index }) => this.subKey + paddedHex(matchId, 8) + paddedHex(index, 4))
      .join('');
  }
}
export type { Sentence };

export class SentenceManager implements EntityManager<Sentence, string> {
  public readonly prefix = 'S:';
  constructor(public readonly context: RedisContext) {}

  async loadKeys(_: string[], rawKeys: string[]): Promise<Buffer[]> {
    const prefixedKeys = rawKeys.map((sentence) => this.prefix + Sentence.createKey(sentence).bucket);
    this.context.client.watch(prefixedKeys);
    const responses = await this.context.client.mGet(commandOptions({ returnBuffers: true }), prefixedKeys);
    return responses.map((buf) => buf ?? Buffer.from([]));
  }
  parse(loadedValue: Buffer, sentence: string): Sentence {
    if (loadedValue.length % 11 != 0)
      throw new Error(`Data for bucket ${sentence} has invalid length of ${loadedValue.length}`);

    const subKey = parseInt(Sentence.createKey(sentence).subKey, 16);
    const matches: SentenceMatch[] = [];
    for (let i = 0; i < loadedValue.length; i += 11) {
      if (loadedValue.readUIntBE(i, 5) != subKey) continue;
      matches.push({ matchId: loadedValue.readUIntBE(i + 5, 4), index: loadedValue.readUIntBE(i + 9, 2) });
    }
    return new Sentence(this.context, sentence, matches);
  }
  create(sentence: string, matches: SentenceMatch[]): Sentence {
    return new Sentence(this.context, sentence, matches);
  }
  save(entity: Sentence): unknown {
    return this.context.transaction.append(this.prefix + entity.key, Buffer.from(entity.toRedis(), 'hex'));
  }
}
