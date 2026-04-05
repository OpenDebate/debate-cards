/**
 * Run deduplication on all unbucketed evidence.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/run-dedup.ts [take]
 *
 * Pass a number to limit how many cards to process. Defaults to all.
 */
import 'reflect-metadata';
import { db } from 'app/lib/db';
import { redis } from 'app/modules/deduplicator/redis';
import dedupeEvidence from 'app/actions/dedupeEvidence';
import { CONCURRENT_DEDUPLICATION } from 'app/constants';

async function main() {
  const take = parseInt(process.argv[2]) || undefined;

  await redis.connect();
  console.log('Redis connected');

  const cards = await db.evidence.findMany({
    where: { bucketId: null },
    select: { gid: true },
    orderBy: { id: 'asc' },
    take,
  });

  console.log(`${cards.length} unbucketed cards to process (concurrency=${CONCURRENT_DEDUPLICATION})\n`);

  let completed = 0;
  let errors = 0;
  const startTime = Date.now();

  // Process in batches matching concurrency
  for (let i = 0; i < cards.length; i += CONCURRENT_DEDUPLICATION) {
    const batch = cards.slice(i, i + CONCURRENT_DEDUPLICATION);
    const results = await Promise.allSettled(batch.map((c) => dedupeEvidence(c)));
    for (const r of results) {
      if (r.status === 'fulfilled') completed++;
      else { errors++; }
    }

    const now = Date.now();
    const elapsed = ((now - startTime) / 1000).toFixed(0);
    const done = completed + errors;
    const rate = (done / ((now - startTime) / 1000)).toFixed(1);
    if (done % 50 < CONCURRENT_DEDUPLICATION || i + CONCURRENT_DEDUPLICATION >= cards.length) {
      console.log(`  [${elapsed}s] ${done}/${cards.length} (${rate}/s) — ${completed} ok, ${errors} err`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s: ${completed} deduped, ${errors} errors`);

  const bucketCount = await db.evidenceBucket.count();
  console.log(`Total buckets: ${bucketCount}`);

  await redis.quit();
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
