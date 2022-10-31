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

export type QueueType =
  | typeof parserModule['queue']
  | typeof deduplicationModule['queue']
  | typeof caselistModule['openevQueue' | 'caselistQueue' | 'schoolQueue' | 'teamQueue' | 'opensourceQueue'];
export type QueueDataType<Q> = Q extends ActionQueue<infer U, any, any> ? U : never;
export type ExtractQueueName<Q> = Q extends ActionQueue<any, infer U, any> ? U : never;
export type ExtractLoadArgs<Q> = Q extends ActionQueue<any, any, infer U> ? U : never;
export type QueueDataTypes = { [Q in QueueType as ExtractQueueName<Q>]: QueueDataType<Q> };
export type QueueLoadArgs = { [Q in QueueType as ExtractQueueName<Q>]: ExtractLoadArgs<Q> };

export type QueueName = keyof QueueDataTypes;

export type IPCActions<N extends QueueName = QueueName> = {
  tasks: { res: QueueDataTypes[N][]; args: { skip: number; take: number } };
  length: { res: number; args: undefined };
  load: { res: number; args: QueueLoadArgs[N] };
  add: { res: number; args: QueueDataTypes[N][] };
};

export type QueueRequestData<Q extends QueueName = QueueName, A extends keyof IPCActions<Q> = QueueAction> = {
  queueName: Q;
  action: A;
  // Dont include property if no args
} & (IPCActions<Q>[A]['args'] extends undefined ? {} : { args: IPCActions<Q>[A]['args'] });

export type QueueAction = keyof IPCActions;

const ipcSocket = axon.socket('rep');
const ipcCallbacks: Record<string, (action: QueueAction, args: IPCActions[QueueAction]['args']) => Promise<any>> = {};
ipcSocket.on('message', async ({ queueName, action, args }: QueueRequestData, reply: (data: any) => void) => {
  if (!(queueName in ipcCallbacks)) return reply({ err: `No queue with name ${queueName} is running` });

  try {
    reply(await ipcCallbacks[queueName](action, args));
  } catch (err) {
    reply({ err: err });
  }
});

export class ActionQueue<T, N extends string, A extends Record<string, any>> {
  public queue = new Queue<T>();
  constructor(
    public name: N,
    public action: (data: T) => Promise<unknown>, // Action to preform
    concurency: number, // Number of actions to preform at once
    emitter?: TypedEvent<T>, // Optional emitter to capture events from
    private loader?: (args: A) => Promise<T[]>, // Optional function to load data into queue, to be called later.
  ) {
    if (emitter) emitter.on((data) => this.queue.enqueue(data));
    for (let i = 0; i < concurency; i++) this.drain();

    // Only connect for process running an actionqueue
    ipcSocket.connect(IPC_PORT, 'api');
    ipcCallbacks[this.name] = async (action, args) => {
      switch (action) {
        case 'tasks':
          const { skip, take } = args as IPCActions[typeof action]['args']; // Automatic narrowing wont work even with generics
          const queueArray: T[] = [];
          // Braces cause cant return number
          this.queue.forEach((el) => {
            queueArray.push(el);
            return;
          });
          return take ? queueArray.slice(skip, skip + take) : queueArray.slice(skip);
        case 'length':
          return this.queue.size();
        case 'load':
          return this.load(args as A);
        case 'add':
          const tasks = args as T[];
          for (const task of tasks) this.queue.enqueue(task);
          return tasks;
      }
    };
  }

  async drain(): Promise<unknown> {
    if (this.queue.size() === 0) return setTimeout(() => this.drain(), 1000);
    this.action(this.queue.dequeue())
      .catch(console.error)
      .finally(() => this.drain());
  }

  async load(args: A): Promise<number> {
    if (!this.loader) return;
    const loaded = await this.loader(args);
    loaded.forEach((data) => this.queue.enqueue(data));
    return loaded.length;
  }
}
