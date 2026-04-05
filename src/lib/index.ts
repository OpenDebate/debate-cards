export * from './debate-tools';
export * from './db';
export * from './events';

// Typesafe async pipe utility
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
// eslint-disable-next-line @typescript-eslint/ban-types
export function pipe(...fns: Function[]) {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return (x: any) => fns.reduce(async (y, fn) => fn(await y), x);
}
