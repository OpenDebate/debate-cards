import { Queue } from 'typescript-collections';
import axon from 'pm2-axon';
import { TypedEvent } from './events';
import { IPC_PORT } from 'app/constants';
import type parserModule from 'app/modules/parser';
import type caselistModule from 'app/modules/caselist';
import type deduplicationModule from 'app/modules/deduplicator';
import type apiModule from 'app/modules/api';

export * from './debate-tools';
export * from './db';
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
export type QueueType =
  | typeof parserModule['queue']
  | typeof deduplicationModule['queue']
  | typeof caselistModule['openevQueue' | 'caselistQueue' | 'schoolQueue' | 'teamQueue'];
export type QueueDataType<Q> = Q extends ActionQueue<infer U, any> ? U : never;
export type ExtractQueueName<Q> = Q extends ActionQueue<any, infer U> ? U : never;
export type QueueDataTypes = {
  [Q in QueueType as ExtractQueueName<Q>]: QueueDataType<Q>;
};
export type QueueName = keyof QueueDataTypes;

export type IPCActions<N extends QueueName> = {
  tasks: { res: QueueDataTypes[N][]; args: { skip: number; take: number } };
  length: { res: number; args: undefined };
};
export type ActionArgs<N extends QueueName> = {
  tasks: QueueDataTypes[N][];
  length: number;
};

export type QueueRequestData<Q extends QueueName, A extends keyof IPCActions<Q> = QueueAction> = {
  queueName: Q;
  action: A;
  // Dont include property if no args
} & (IPCActions<Q>[A]['args'] extends undefined ? {} : { args: IPCActions<Q>[A]['args'] });

export type QueueAction = keyof IPCActions<QueueName>;

const ipcSocket = axon.socket('rep');
const ipcCallbacks: Record<string, <A extends QueueAction>(action: A, args: IPCActions<QueueName>[A]['args']) => any> =
  {};
ipcSocket.on('message', ({ queueName, action, args }: QueueRequestData<QueueName>, reply: (data: any) => void) => {
  if (!(queueName in ipcCallbacks)) return reply({ err: `No queue with name ${queueName} exists` });

  reply(ipcCallbacks[queueName](action, args));
});

export class ActionQueue<T, K extends string> {
  public queue = new Queue<T>();
  constructor(
    public name: K,
    public action: (data: T) => Promise<unknown>, // Action to preform
    concurency: number, // Number of actions to preform at once
    emitter?: TypedEvent<T>, // Optional emitter to capture events from
    private loader?: () => Promise<T[]>, // Optional function to load data into queue, to be called later.
  ) {
    if (emitter) emitter.on((data) => this.queue.enqueue(data));
    for (let i = 0; i < concurency; i++) this.drain();

    // Only connect for process running an actionqueue
    ipcSocket.connect(IPC_PORT, 'api');
    ipcCallbacks[this.name] = (action, args) => {
      switch (action) {
        case 'tasks':
          const { skip, take } = args;
          const queueArray: T[] = [];
          // Braces cause cant return number
          this.queue.forEach((el) => {
            queueArray.push(el);
            return;
          });
          return take ? queueArray.slice(skip, skip + take) : queueArray.slice(skip);
        case 'length':
          return this.queue.size();
      }
    };
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
