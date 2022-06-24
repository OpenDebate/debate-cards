import { Queue } from 'typescript-collections';
import { TypedEvent } from './events';

export * from './debate-tools';
export * from './db';
export * from './redis';
export * from './events';

// XXX: hacky solution for typesafe async pipe
type MaybePromise<T> = Promise<T> | T;
export function pipe<A, B>(ab: (a: A) => MaybePromise<B>): (a: MaybePromise<A>) => Promise<B>;
export function pipe<A, B, C>(
  ab: (a: A) => MaybePromise<B>,
  bc: (b: B) => MaybePromise<C>,
): (a: MaybePromise<A>) => Promise<C>;
export function pipe<A, B, C, D>(
  ab: (a: A) => MaybePromise<B>,
  bc: (b: B) => MaybePromise<C>,
  cd: (c: C) => MaybePromise<D>,
): (a: MaybePromise<A>) => Promise<D>;
export function pipe<A, B, C, D, E>(
  ab: (a: A) => MaybePromise<B>,
  bc: (b: B) => MaybePromise<C>,
  cd: (c: C) => MaybePromise<D>,
  de: (c: D) => MaybePromise<E>,
): (a: MaybePromise<A>) => Promise<E>;
// extend to a reasonable amount of arguments
// eslint-disable-next-line @typescript-eslint/ban-types
export function pipe(...fns: Function[]) {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return (x: any) => fns.reduce(async (y, fn) => fn(await y), x);
}
export class Lock {
  unlock: () => void;
  promise: Promise<void>;
  constructor() {
    this.promise = new Promise((resolve) => (this.unlock = resolve));
  }
}
export class ActionQueue<T> {
  public queue = new Queue<T>();
  constructor(
    public action: (data: T) => Promise<unknown>, // Action to preform
    concurency: number, // Number of actions to preform at once
    emitter?: TypedEvent<T>, // Optional emitter to capture events from
    private loader?: () => Promise<T[]>, // Optional function to load data into queue, to be called later.
  ) {
    if (emitter) emitter.on((data) => this.queue.enqueue(data));
    for (let i = 0; i < concurency; i++) this.drain();
  }

  async drain(): Promise<unknown> {
    if (this.queue.size() === 0) return setTimeout(() => this.drain(), 1000);
    this.action(this.queue.dequeue())
      .catch(console.error)
      .finally(() => this.drain());
  }

  async load(): Promise<void> {
    if (!this.loader) return;
    (await this.loader()).forEach((data) => this.queue.enqueue(data));
  }
}
