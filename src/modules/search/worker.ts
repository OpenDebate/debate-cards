import { ack, claimBatch, isPaused, recoverInflight, requeue } from './dirty';
import { ensureIndex, indexIds, IndexingError } from './indexer';

const BATCH = parseInt(process.env.SEARCH_INDEX_BATCH) || 500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let stopping = false;

async function loop(): Promise<void> {
  // Elasticsearch may still be starting, or the index may need a manual reindex; keep trying and say why
  for (;;) {
    try {
      await ensureIndex();
      break;
    } catch (err) {
      console.error(`[search] index not ready: ${err.message}`);
      if (stopping) return;
      await sleep(10_000);
    }
  }
  const recovered = await recoverInflight();
  if (recovered) console.log(`[search] re-queued ${recovered} cards that were in flight when the last indexer stopped`);
  console.log('[search] indexer running');

  while (!stopping) {
    if (await isPaused()) {
      await sleep(2000);
      continue;
    }
    const ids = await claimBatch(BATCH);
    if (!ids.length) {
      await sleep(1000);
      continue;
    }
    try {
      await indexIds(ids);
      await ack(ids);
    } catch (err) {
      // Only the rejected documents need another go; if the whole request failed, retry the lot
      const failed = err instanceof IndexingError ? err.failedIds : ids;
      await ack(ids.filter((id) => !failed.includes(id)));
      await requeue(failed);
      console.error(`[search] indexing failed for ${failed.length} of ${ids.length} cards, will retry: ${err.message}`);
      await sleep(5000);
    }
  }
}

const running = loop().catch((err) => {
  console.error('[search] indexer stopped unexpectedly', err);
  process.exit(1);
});

/** Same shape as a BullMQ Worker so src/tasks.ts can shut it down with the others. */
export const searchIndexer = {
  async close(): Promise<void> {
    stopping = true;
    await running;
  },
};
