/**
 * Bucket Verification Test
 *
 * Validates deduplication bucketing by sampling large buckets and identifying
 * "bad cards" — cards that don't belong in the bucket they're assigned to.
 *
 * A card is flagged as bad if it matches fewer than BAD_CARD_THRESHOLD fraction
 * of the other cards in its bucket. Cards with 0 matches to the root are
 * additionally highlighted as high-confidence errors.
 *
 * Usage:
 *   RUN_DB_TESTS=1 BUCKET_ID=123 yarn test -- bucket-verify   # Check a specific bucket
 *   RUN_DB_TESTS=1 NUM_BUCKETS=10 yarn test -- bucket-verify   # Check more buckets
 *   RUN_DB_TESTS=1 yarn test -- bucket-verify   # Default: 5 random large buckets
 *
 * Requires a running database with populated evidence and bucket data.
 */
import { getSentences } from 'app/lib/debate-tools/duplicate';
import { MIN_COUNT_FRACTION, EDGE_TOLERANCE } from 'app/constants';
import { db } from 'app/lib/db';

const BUCKET_ID = process.env.BUCKET_ID ? parseInt(process.env.BUCKET_ID) : null;
const NUM_BUCKETS = process.env.NUM_BUCKETS ? parseInt(process.env.NUM_BUCKETS) : 5;
const TOP_N_POOL = 100;      // draw randomly from the top N largest buckets
const CARDS_PER_BUCKET = 40;
// A card must match at least this fraction of other bucket members to be considered "good"
const BAD_CARD_THRESHOLD = 0.1;

type CardInfo = {
  id: number;
  gid: string;
  tag: string;
  fulltext: string | null;
  sentences: string[];
};

type CardScore = {
  card: CardInfo;
  matchCount: number;       // how many other cards in the bucket this card matches
  bucketSize: number;       // total cards checked against
  matchFraction: number;    // matchCount / bucketSize
  matchesRoot: boolean;
};

function computeMatch(a: CardInfo, b: CardInfo): boolean {
  let matchCount = 0;
  let aMin = Infinity, aMax = -Infinity;
  let bMin = Infinity, bMax = -Infinity;

  for (let ai = 0; ai < a.sentences.length; ai++) {
    const bi = b.sentences.indexOf(a.sentences[ai]);
    if (bi !== -1) {
      matchCount++;
      aMin = Math.min(aMin, ai); aMax = Math.max(aMax, ai);
      bMin = Math.min(bMin, bi); bMax = Math.max(bMax, bi);
    }
  }

  if (matchCount < Math.max(a.sentences.length, b.sentences.length) * MIN_COUNT_FRACTION) return false;
  const aTol = Math.ceil(a.sentences.length * EDGE_TOLERANCE);
  const bTol = Math.ceil(b.sentences.length * EDGE_TOLERANCE);
  return (aMin <= aTol || bMin <= bTol) && (a.sentences.length - 1 - aMax <= aTol || b.sentences.length - 1 - bMax <= bTol);
}

function scoreCards(cards: CardInfo[], rootId: number): CardScore[] {
  return cards.map((card) => {
    const others = cards.filter((c) => c.id !== card.id);
    const matchCount = others.filter((other) => computeMatch(card, other)).length;
    const root = cards.find((c) => c.id === rootId);
    return {
      card,
      matchCount,
      bucketSize: others.length,
      matchFraction: others.length > 0 ? matchCount / others.length : 0,
      matchesRoot: root && root.id !== card.id ? computeMatch(card, root) : true,
    };
  });
}

function printBucketReport(bucketId: number, rootId: number, scores: CardScore[], badCards: CardScore[]) {
  const label = `Bucket #${bucketId} (root #${rootId}, ${scores.length} cards sampled)`;
  if (badCards.length === 0) {
    console.log(`  ✓ ${label} — no bad cards found`);
    return;
  }
  console.log(`\n  ✗ ${label} — ${badCards.length} bad card(s):`);
  for (const s of badCards) {
    const rootFlag = s.matchesRoot ? '' : ' [NO ROOT MATCH]';
    console.log(
      `    #${s.card.id} (${s.card.gid}) matches ${s.matchCount}/${s.bucketSize} peers` +
      ` (${(s.matchFraction * 100).toFixed(0)}%)${rootFlag}`,
    );
    console.log(`      tag: "${s.card.tag?.slice(0, 100) ?? '(none)'}"`);
  }
}

async function loadBucketCards(bucketId: number) {
  return db.evidenceBucket.findUnique({
    where: { id: bucketId },
    select: {
      id: true,
      rootId: true,
      count: true,
      evidence: {
        select: { id: true, gid: true, tag: true, fulltext: true },
        take: CARDS_PER_BUCKET,
      },
    },
  });
}

// Needs the Postgres from DATABASE_URL, populated by a real load. Opt in with RUN_DB_TESTS=1 so `yarn test` passes without a database.
const describeDb = process.env.RUN_DB_TESTS ? describe : describe.skip;

describeDb('Bucket Verification', () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  test('identifies bad cards across a random sample of large buckets', async () => {
    let bucketIds: number[];

    if (BUCKET_ID) {
      bucketIds = [BUCKET_ID];
    } else {
      // Draw randomly from the top N largest buckets
      const pool = await db.evidenceBucket.findMany({
        orderBy: { count: 'desc' },
        take: TOP_N_POOL,
        select: { id: true, count: true },
      });
      if (pool.length === 0) {
        console.log('No buckets found — run deduplication first');
        return;
      }
      // Fisher-Yates shuffle then take NUM_BUCKETS
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      bucketIds = pool.slice(0, Math.min(NUM_BUCKETS, pool.length)).map((b) => b.id);
    }

    console.log(`\nChecking ${bucketIds.length} bucket(s): [${bucketIds.join(', ')}]\n`);

    const allBadCards: { bucketId: number; score: CardScore }[] = [];

    for (const bucketId of bucketIds) {
      const bucket = await loadBucketCards(bucketId);
      if (!bucket) {
        console.log(`  Bucket #${bucketId} not found, skipping`);
        continue;
      }

      const cards: CardInfo[] = bucket.evidence.map((e) => ({
        id: e.id,
        gid: e.gid,
        tag: e.tag,
        fulltext: e.fulltext,
        sentences: getSentences(e.fulltext),
      }));

      if (cards.length < 2) {
        console.log(`  Bucket #${bucketId} has <2 cards loaded, skipping`);
        continue;
      }

      const scores = scoreCards(cards, bucket.rootId);
      const badCards = scores.filter((s) => s.matchFraction < BAD_CARD_THRESHOLD);

      printBucketReport(bucketId, bucket.rootId, scores, badCards);
      allBadCards.push(...badCards.map((s) => ({ bucketId, score: s })));
    }

    if (allBadCards.length > 0) {
      const noRootMatch = allBadCards.filter((b) => !b.score.matchesRoot);
      console.log(
        `\nTotal bad cards: ${allBadCards.length} across ${bucketIds.length} bucket(s)` +
        (noRootMatch.length > 0 ? ` (${noRootMatch.length} with no root match)` : ''),
      );
    }

    expect(allBadCards.length).toBe(0);
  }, 60_000);
});
