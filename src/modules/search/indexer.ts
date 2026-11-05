import { db } from 'app/lib';
import { elastic } from 'app/lib/elastic';
import { buildDocuments } from './documents';
import { setPaused } from './dirty';
import { INDEX_ALIAS, indexMappings, indexSettings } from './mapping';

/** Thrown when Elasticsearch rejected some documents of a bulk request; `failedIds` are the ones to retry. */
export class IndexingError extends Error {
  constructor(message: string, public readonly failedIds: number[]) {
    super(message);
  }
}

const REINDEX_BATCH = parseInt(process.env.SEARCH_REINDEX_BATCH) || 500;

const createIndex = (name: string) => elastic.indices.create({ index: name, settings: indexSettings as any, mappings: indexMappings as any });

/** Creates the first index behind the alias if there is none. */
export async function ensureIndex(): Promise<void> {
  if (await elastic.indices.existsAlias({ name: INDEX_ALIAS })) return;
  if (await elastic.indices.exists({ index: INDEX_ALIAS })) {
    throw new Error(
      `"${INDEX_ALIAS}" is a plain index (made by the old pgsync setup), not an alias. ` +
        `Run "docker compose run --rm loader reindex" to replace it.`,
    );
  }
  const name = `${INDEX_ALIAS}_v${Date.now()}`;
  await createIndex(name);
  await elastic.indices.putAlias({ index: name, name: INDEX_ALIAS });
  console.log(`[search] created index ${name} behind alias ${INDEX_ALIAS}`);
}

/** Writes the current state of these cards into `index`; cards that no longer exist are deleted from it. */
async function writeBatch(index: string, ids: number[]): Promise<void> {
  const docs = await buildDocuments(ids);
  const found = new Set(docs.map((doc) => doc.id));
  const operations: unknown[] = [];
  for (const doc of docs) operations.push({ index: { _index: index, _id: String(doc.id) } }, doc);
  for (const id of ids) if (!found.has(id)) operations.push({ delete: { _index: index, _id: String(id) } });
  if (!operations.length) return;

  const response = await elastic.bulk({ operations: operations as any, refresh: false });
  if (!response.errors) return;
  const failed = response.items.flatMap((item) => {
    const result = item.index ?? item.delete;
    return result?.error ? [Number(result._id)] : [];
  });
  const sample = response.items.map((item) => (item.index ?? item.delete)?.error).find(Boolean);
  throw new IndexingError(`${failed.length} of ${ids.length} documents rejected: ${JSON.stringify(sample)}`, failed);
}

export const indexIds = (ids: number[]): Promise<void> => writeBatch(INDEX_ALIAS, ids);

/**
 * Rebuilds the whole index from Postgres into a new index and swaps the alias over in one step, so search keeps
 * working throughout. Also converts a plain `evidence` index left by the old pgsync setup into an alias. The
 * indexer is paused meanwhile; the changes it holds back are applied to the new index afterwards.
 */
export async function reindexAll(log: (message: string) => void = console.log): Promise<number> {
  const next = `${INDEX_ALIAS}_v${Date.now()}`;
  await setPaused(true);
  try {
    await createIndex(next);
    let last = 0;
    let total = 0;
    for (;;) {
      const rows = await db.evidence.findMany({ where: { id: { gt: last } }, select: { id: true }, orderBy: { id: 'asc' }, take: REINDEX_BATCH });
      if (!rows.length) break;
      const ids = rows.map((row) => row.id);
      await writeBatch(next, ids);
      last = ids[ids.length - 1];
      total += ids.length;
      await setPaused(true); // keep the pause alive
      if (Math.floor(total / REINDEX_BATCH) % 40 === 0) log(`[search] reindexed ${total} cards`);
    }
    await elastic.indices.refresh({ index: next });

    const isAlias = await elastic.indices.existsAlias({ name: INDEX_ALIAS });
    const isIndex = !isAlias && (await elastic.indices.exists({ index: INDEX_ALIAS }));
    const oldIndices = isAlias ? Object.keys(await elastic.indices.getAlias({ name: INDEX_ALIAS })) : [];
    const actions: any[] = [];
    if (isIndex) actions.push({ remove_index: { index: INDEX_ALIAS } });
    for (const index of oldIndices) actions.push({ remove: { index, alias: INDEX_ALIAS } });
    actions.push({ add: { index: next, alias: INDEX_ALIAS } });
    await elastic.indices.updateAliases({ actions });
    for (const index of oldIndices) await elastic.indices.delete({ index });
    log(`[search] reindex done: ${total} cards in ${next}`);
    return total;
  } catch (err) {
    await elastic.indices.delete({ index: next }, { ignore: [404] }).catch(() => undefined);
    throw err;
  } finally {
    await setPaused(false);
  }
}
