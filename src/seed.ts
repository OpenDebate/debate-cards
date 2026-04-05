/**
 * Seed script — populates the database from local .docx files.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/seed.ts [count]
 *
 * Pass "all" or 0 for all files. Defaults to 10.
 * Runs with concurrency of 10 parsers and batched DB inserts.
 */
import 'reflect-metadata';
import { db } from 'app/lib/db';
import { documentToTokens } from 'app/lib/debate-tools/document';
import { extractCards } from 'app/lib/debate-tools/parse';
import { simplifyTokens } from 'app/lib/debate-tools/tokens';
import { makeId, makeChildId } from 'app/lib/debate-tools/id';
import { readFile } from 'fs/promises';
import path from 'path';

const DOCUMENT_DIR = './documents';
const CONCURRENCY = 10;

function findDocxFiles(maxCount: number): string[] {
  const { execSync } = require('child_process');
  const limit = maxCount > 0 ? `| head -${maxCount}` : '';
  const output = execSync(`find ${DOCUMENT_DIR} -name "*.docx" -type f ${limit}`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
  return output.trim().split('\n').filter(Boolean);
}

let completed = 0;
let errors = 0;
let skipped = 0;
let totalCards = 0;
let totalFiles = 0;

async function seedFile(filePath: string): Promise<void> {
  const buffer = await readFile(filePath);
  const { fileId: gid } = await makeId(buffer);
  const fileName = path.parse(filePath).name;

  // Skip if already exists
  const existing = await db.file.findUnique({ where: { gid }, select: { id: true } });
  if (existing) {
    skipped++;
    return;
  }

  // Create file record
  const file = await db.file.create({
    data: { gid, name: fileName, path: filePath, status: 'PROCESSING' },
  });

  // Parse document
  let cards;
  try {
    const tokens = await documentToTokens(filePath);
    const simplified = tokens.map(simplifyTokens);
    cards = extractCards(simplified);
  } catch (err) {
    await db.file.update({ where: { id: file.id }, data: { status: 'ERROR' } });
    errors++;
    return;
  }

  if (cards.length === 0) {
    await db.file.update({ where: { id: file.id }, data: { status: 'PROCESSED' } });
    completed++;
    return;
  }

  // Batch insert evidence via createMany (much faster than individual upserts)
  try {
    await db.evidence.createMany({
      data: cards.map((card, i) => ({
        gid: makeChildId(gid, i),
        tag: card.tag,
        cite: card.cite,
        fullcite: card.fullcite,
        summary: card.summary,
        spoken: card.spoken,
        fulltext: card.fulltext,
        markup: card.markup,
        pocket: card.pocket,
        hat: card.hat,
        block: card.block,
        fileId: file.id,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    await db.file.update({ where: { id: file.id }, data: { status: 'ERROR' } });
    errors++;
    return;
  }

  await db.file.update({ where: { id: file.id }, data: { status: 'PROCESSED' } });
  totalCards += cards.length;
  completed++;
}

async function runBatch(files: string[], startIdx: number): Promise<void> {
  const batch = files.slice(startIdx, startIdx + CONCURRENCY);
  await Promise.allSettled(batch.map((f) => seedFile(f).catch(() => { errors++; })));
}

async function main() {
  const arg = process.argv[2];
  const count = arg === 'all' ? 0 : (parseInt(arg) || 10);

  console.log(`\nFinding .docx files in ${DOCUMENT_DIR}/...`);
  const files = findDocxFiles(count);
  totalFiles = files.length;

  if (files.length === 0) {
    console.error('No .docx files found');
    process.exit(1);
  }

  console.log(`Found ${files.length} files. Seeding with concurrency=${CONCURRENCY}...\n`);

  const startTime = Date.now();
  let lastReport = Date.now();

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    await runBatch(files, i);

    // Progress report every 5 seconds
    const now = Date.now();
    if (now - lastReport > 5000 || i + CONCURRENCY >= files.length) {
      const done = completed + errors + skipped;
      const elapsed = ((now - startTime) / 1000).toFixed(0);
      const rate = (done / ((now - startTime) / 1000)).toFixed(1);
      const eta = done > 0 ? (((files.length - done) / (done / ((now - startTime) / 1000))) / 60).toFixed(1) : '?';
      console.log(
        `  [${elapsed}s] ${done}/${files.length} (${rate}/s) — ` +
        `${completed} ok, ${errors} err, ${skipped} skip, ${totalCards} cards — ETA ${eta}m`,
      );
      lastReport = now;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s: ${completed} parsed, ${errors} errors, ${skipped} skipped, ${totalCards} cards`);

  const counts = {
    files: await db.file.count(),
    evidence: await db.evidence.count(),
    processed: await db.file.count({ where: { status: 'PROCESSED' } }),
    errors: await db.file.count({ where: { status: 'ERROR' } }),
  };
  console.log('Database state:', counts);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
