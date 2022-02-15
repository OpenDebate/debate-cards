export * from './debate-tools';
export * from './db';
export * from './events';
export * from './request';

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
  return (x: any) => fns.reduce(async (y, fn) => fn(await y), x);
}

export function timeElapsed(startTime: number): string {
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const minuteString = (minutes % 60).toString().padStart(2, '0');
  const secondsString = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minuteString}:${secondsString}`;
}
