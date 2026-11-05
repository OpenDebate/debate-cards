#!/usr/bin/env ts-node -r tsconfig-paths/register
/**
 * CLI utility to compare an original .docx with a regenerated .docx.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/__tests__/utils/compare-docx.ts <original.docx> [regenerated.docx]
 *
 * If only one file is given, it will parse → regenerate → re-parse and compare.
 * If two files are given, it will parse both and compare the extracted cards.
 */
import { documentToTokens } from 'app/lib/debate-tools/document';
import { extractCards } from 'app/lib/debate-tools/parse';
import { tokensToDocument, simplifyTokens, TextBlock } from 'app/lib/debate-tools/tokens';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const normalize = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

function diffCards(
  aCards: ReturnType<typeof extractCards>,
  bCards: ReturnType<typeof extractCards>,
  labelA: string,
  labelB: string,
) {
  console.log(`\n${labelA}: ${aCards.length} cards`);
  console.log(`${labelB}: ${bCards.length} cards\n`);

  const count = Math.min(aCards.length, bCards.length);
  let matches = 0;
  let tagMatches = 0;
  let fulltextMatches = 0;

  for (let i = 0; i < count; i++) {
    const a = aCards[i];
    const b = bCards[i];
    const tMatch = normalize(a.tag) === normalize(b.tag);
    const fMatch = normalize(a.fulltext) === normalize(b.fulltext);
    if (tMatch) tagMatches++;
    if (fMatch) fulltextMatches++;
    if (tMatch && fMatch) {
      matches++;
    } else {
      console.log(`Card ${i}:`);
      if (!tMatch) {
        console.log(`  TAG DIFF:`);
        console.log(`    ${labelA}: ${a.tag?.slice(0, 120)}`);
        console.log(`    ${labelB}: ${b.tag?.slice(0, 120)}`);
      }
      if (!fMatch) {
        const aText = normalize(a.fulltext);
        const bText = normalize(b.fulltext);
        // Find first difference position
        let diffPos = 0;
        while (diffPos < aText.length && diffPos < bText.length && aText[diffPos] === bText[diffPos]) diffPos++;
        const ctx = 50;
        console.log(`  FULLTEXT DIFF at position ${diffPos}:`);
        console.log(`    ${labelA}: ...${aText.slice(Math.max(0, diffPos - ctx), diffPos + ctx)}...`);
        console.log(`    ${labelB}: ...${bText.slice(Math.max(0, diffPos - ctx), diffPos + ctx)}...`);
      }
      console.log('');
    }
  }

  if (aCards.length !== bCards.length) {
    console.log(`CARD COUNT MISMATCH: ${aCards.length} vs ${bCards.length}`);
    if (aCards.length > bCards.length) {
      console.log(`Extra cards in ${labelA}:`);
      for (let i = count; i < aCards.length; i++) {
        console.log(`  Card ${i}: "${aCards[i].tag?.slice(0, 100)}"`);
      }
    } else {
      console.log(`Extra cards in ${labelB}:`);
      for (let i = count; i < bCards.length; i++) {
        console.log(`  Card ${i}: "${bCards[i].tag?.slice(0, 100)}"`);
      }
    }
  }

  console.log(`\nSUMMARY:`);
  console.log(`  ${matches}/${count} cards fully identical`);
  console.log(`  ${tagMatches}/${count} tags match`);
  console.log(`  ${fulltextMatches}/${count} fulltexts match`);
}

async function main() {
  const [, , fileA, fileB] = process.argv;

  if (!fileA) {
    console.error('Usage: compare-docx.ts <original.docx> [regenerated.docx]');
    process.exit(1);
  }

  const tokensA = (await documentToTokens(fileA)).map(simplifyTokens);
  const cardsA = extractCards(tokensA);

  let cardsB: ReturnType<typeof extractCards>;
  let labelB: string;

  if (fileB) {
    const tokensB = (await documentToTokens(fileB)).map(simplifyTokens);
    cardsB = extractCards(tokensB);
    labelB = 'File B';
  } else {
    // Round-trip: regenerate from parsed tokens
    console.log('No second file — performing round-trip comparison...');
    const buffer = await tokensToDocument(tokensA);
    const tempPath = join(tmpdir(), `compare-${Date.now()}.docx`);
    await fs.writeFile(tempPath, buffer);
    const tokensB = (await documentToTokens(tempPath)).map(simplifyTokens);
    cardsB = extractCards(tokensB);
    await fs.unlink(tempPath);
    labelB = 'Regenerated';
  }

  diffCards(cardsA, cardsB, 'Original', labelB);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
