#!/usr/bin/env ts-node -r tsconfig-paths/register
/**
 * CLI utility to inspect a deduplication bucket.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/__tests__/utils/inspect-bucket.ts [BUCKET_ID]
 *
 * Without BUCKET_ID, inspects the 5 largest buckets.
 * With BUCKET_ID, shows full detail for that bucket including pairwise similarity.
 */
import { db } from 'app/lib/db';
import { getSentences } from 'app/lib/debate-tools/duplicate';
import { MIN_COUNT_FRACTION, EDGE_TOLERANCE } from 'app/constants';

function pairSimilarity(aSentences: string[], bSentences: string[]) {
  let matchCount = 0;
  let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;

  for (let ai = 0; ai < aSentences.length; ai++) {
    const bi = bSentences.indexOf(aSentences[ai]);
    if (bi !== -1) {
      matchCount++;
      aMin = Math.min(aMin, ai); aMax = Math.max(aMax, ai);
      bMin = Math.min(bMin, bi); bMax = Math.max(bMax, bi);
    }
  }

  let shouldMatch = false;
  if (matchCount >= Math.max(aSentences.length, bSentences.length) * MIN_COUNT_FRACTION) {
    const aTol = Math.ceil(aSentences.length * EDGE_TOLERANCE);
    const bTol = Math.ceil(bSentences.length * EDGE_TOLERANCE);
    shouldMatch = (aMin <= aTol || bMin <= bTol) && (aSentences.length - 1 - aMax <= aTol || bSentences.length - 1 - bMax <= bTol);
  }

  const ratio = Math.max(aSentences.length, bSentences.length) > 0
    ? matchCount / Math.max(aSentences.length, bSentences.length)
    : 0;

  return { matchCount, ratio: Math.round(ratio * 1000) / 1000, shouldMatch };
}

async function inspectBucket(bucketId: number) {
  const bucket = await db.evidenceBucket.findUnique({
    where: { id: bucketId },
    include: {
      evidence: { select: { id: true, gid: true, tag: true, cite: true, fulltext: true }, orderBy: { id: 'asc' } },
      root: { select: { id: true, gid: true, tag: true } },
    },
  });

  if (!bucket) {
    console.error(`Bucket #${bucketId} not found`);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`BUCKET #${bucket.id} — ${bucket.count} cards`);
  console.log(`Root: #${bucket.root.id} (${bucket.root.gid}) — "${bucket.root.tag?.slice(0, 80)}"`);
  console.log(`${'='.repeat(80)}\n`);

  const cards = bucket.evidence.map((e) => ({
    ...e,
    sentences: getSentences(e.fulltext),
  }));

  for (const card of cards) {
    const isRoot = card.id === bucket.rootId;
    console.log(`${isRoot ? '★' : ' '} Card #${card.id} (${card.gid}) — ${card.sentences.length} sentences`);
    console.log(`  Tag:  ${card.tag?.slice(0, 100)}`);
    console.log(`  Cite: ${card.cite?.slice(0, 100)}`);
    console.log(`  Text: ${card.fulltext?.slice(0, 150)}...`);
    console.log('');
  }

  console.log('PAIRWISE SIMILARITY:');
  let matchPairs = 0, totalPairs = 0;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const sim = pairSimilarity(cards[i].sentences, cards[j].sentences);
      const label = sim.shouldMatch ? '✓ MATCH' : '✗ NO MATCH';
      console.log(`  ${label}  #${cards[i].id} ↔ #${cards[j].id}  — ${sim.matchCount} common, ratio=${sim.ratio}`);
      totalPairs++;
      if (sim.shouldMatch) matchPairs++;
    }
  }
  console.log(`\n${matchPairs}/${totalPairs} pairs match\n`);
}

async function listLargest(n: number) {
  const buckets = await db.evidenceBucket.findMany({
    orderBy: { count: 'desc' },
    take: n,
    include: {
      root: { select: { id: true, gid: true, tag: true } },
    },
  });

  console.log(`\nTop ${n} largest buckets:\n`);
  for (const b of buckets) {
    console.log(`  Bucket #${b.id} — ${b.count} cards — root: "${b.root.tag?.slice(0, 80)}"`);
  }
  console.log(`\nRun with a bucket ID to see details: npx ts-node -r tsconfig-paths/register src/__tests__/utils/inspect-bucket.ts <ID>\n`);
}

async function main() {
  const arg = process.argv[2];
  if (arg) {
    await inspectBucket(parseInt(arg));
  } else {
    await listLargest(10);
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
