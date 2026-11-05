import { connection } from 'app/lib/queues/connection';

/*
  The change queue between the code that edits cards and the indexer.

  Writers add the ids of cards whose search document is out of date to a Redis set. A set, not a job per card,
  because dedup touches every card in a bucket each time one joins it: the same id marked a hundred times is still
  indexed once, from whatever Postgres holds at that moment, so repeated or out-of-order updates cannot leave the
  index stale.

  The indexer moves a batch from `dirty` to `inflight` in one step. If the process dies mid-batch the ids are still
  in `inflight` and are put back on startup. Assumes a single indexer process.
*/
const DIRTY = 'search:dirty';
const INFLIGHT = 'search:inflight';
const PAUSED = 'search:paused';

const CLAIM = `
local ids = redis.call('SPOP', KEYS[1], ARGV[1])
if #ids > 0 then redis.call('SADD', KEYS[2], unpack(ids)) end
return ids`;

const CHUNK = 1000;
const chunks = <T>(items: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
};

export const markDirty = async (ids: number[]): Promise<void> => {
  for (const chunk of chunks([...new Set(ids)])) await connection.sadd(DIRTY, ...chunk.map(String));
};

export const claimBatch = async (size: number): Promise<number[]> =>
  ((await connection.eval(CLAIM, 2, DIRTY, INFLIGHT, size)) as string[]).map(Number);

export const ack = async (ids: number[]): Promise<void> => {
  for (const chunk of chunks(ids)) await connection.srem(INFLIGHT, ...chunk.map(String));
};

export const requeue = async (ids: number[]): Promise<void> => {
  for (const chunk of chunks(ids)) {
    const members = chunk.map(String);
    await connection.multi().sadd(DIRTY, ...members).srem(INFLIGHT, ...members).exec();
  }
};

export const recoverInflight = async (): Promise<number> => {
  const ids = (await connection.smembers(INFLIGHT)).map(Number);
  await requeue(ids);
  return ids.length;
};

export const backlog = async (): Promise<{ pending: number; inflight: number }> => ({
  pending: await connection.scard(DIRTY),
  inflight: await connection.scard(INFLIGHT),
});

/** Held while a full reindex runs so the indexer does not write to the index being replaced. Expires on its own. */
export const setPaused = async (paused: boolean): Promise<void> => {
  if (paused) await connection.set(PAUSED, '1', 'EX', 600);
  else await connection.del(PAUSED);
};
export const isPaused = async (): Promise<boolean> => (await connection.exists(PAUSED)) === 1;
