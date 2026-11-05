/**
 * Parse Round-Trip Test
 *
 * Validates parsing accuracy by:
 * 1. Parsing a .docx file into tokens/cards
 * 2. Regenerating a .docx from those cards
 * 3. Re-parsing the generated .docx
 * 4. Comparing the extracted cards from original vs generated
 *
 * Usage:
 *   DOCX_PATH=./documents/some-file.docx yarn test -- parse-roundtrip
 *
 * If DOCX_PATH is not set, the test creates a synthetic document to validate
 * the pipeline end-to-end.
 */
import { documentToTokens } from 'app/lib/debate-tools/document';
import { extractCards } from 'app/lib/debate-tools/parse';
import { tokensToDocument, tokensToMarkup, simplifyTokens, TextBlock } from 'app/lib/debate-tools/tokens';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DOCX_PATH = process.env.DOCX_PATH;

// Normalize whitespace for comparison — parsers may introduce small spacing diffs
const normalize = (text: string | null | undefined): string =>
  (text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

// Compare two sets of extracted cards field-by-field
function compareCards(
  original: ReturnType<typeof extractCards>,
  regenerated: ReturnType<typeof extractCards>,
) {
  const results = {
    totalOriginal: original.length,
    totalRegenerated: regenerated.length,
    cardCountMatch: original.length === regenerated.length,
    matches: [] as { index: number; tagMatch: boolean; citeMatch: boolean; fulltextMatch: boolean; summaryMatch: boolean }[],
    mismatches: [] as { index: number; field: string; original: string; regenerated: string }[],
  };

  const count = Math.min(original.length, regenerated.length);
  for (let i = 0; i < count; i++) {
    const orig = original[i];
    const regen = regenerated[i];

    const tagMatch = normalize(orig.tag) === normalize(regen.tag);
    const citeMatch = normalize(orig.cite) === normalize(regen.cite);
    const fulltextMatch = normalize(orig.fulltext) === normalize(regen.fulltext);
    const summaryMatch = normalize(orig.summary) === normalize(regen.summary);

    results.matches.push({ index: i, tagMatch, citeMatch, fulltextMatch, summaryMatch });

    if (!tagMatch) results.mismatches.push({ index: i, field: 'tag', original: orig.tag, regenerated: regen.tag });
    if (!fulltextMatch) results.mismatches.push({ index: i, field: 'fulltext', original: orig.fulltext?.slice(0, 200), regenerated: regen.fulltext?.slice(0, 200) });
  }

  return results;
}

// Compare token-level structure between original and regenerated
function compareTokenBlocks(original: TextBlock[], regenerated: TextBlock[]) {
  const results = {
    totalOriginal: original.length,
    totalRegenerated: regenerated.length,
    blockCountMatch: original.length === regenerated.length,
    formatMismatches: [] as { index: number; originalFormat: string; regeneratedFormat: string }[],
    textDiffs: [] as { index: number; originalText: string; regeneratedText: string }[],
  };

  const count = Math.min(original.length, regenerated.length);
  for (let i = 0; i < count; i++) {
    const origBlock = original[i];
    const regenBlock = regenerated[i];

    if (origBlock.format !== regenBlock.format) {
      results.formatMismatches.push({
        index: i,
        originalFormat: origBlock.format,
        regeneratedFormat: regenBlock.format,
      });
    }

    const origText = origBlock.tokens.map((t) => t.text).join('');
    const regenText = regenBlock.tokens.map((t) => t.text).join('');
    if (normalize(origText) !== normalize(regenText)) {
      results.textDiffs.push({
        index: i,
        originalText: origText.slice(0, 150),
        regeneratedText: regenText.slice(0, 150),
      });
    }
  }

  return results;
}

describe('Parse Round-Trip', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'debate-cards-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  if (DOCX_PATH) {
    test('round-trip: original docx → cards → regenerated docx → cards', async () => {
      // Step 1: Parse original
      const originalTokens = await documentToTokens(DOCX_PATH);
      const originalSimplified = originalTokens.map(simplifyTokens);
      const originalCards = extractCards(originalSimplified);

      expect(originalCards.length).toBeGreaterThan(0);
      console.log(`Original: ${originalCards.length} cards from ${originalTokens.length} blocks`);

      // Step 2: Regenerate document from tokens
      const regenBuffer = await tokensToDocument(originalSimplified);
      const regenPath = join(tempDir, 'regenerated.docx');
      await fs.writeFile(regenPath, regenBuffer);

      // Step 3: Re-parse regenerated document
      const regenTokens = await documentToTokens(regenPath);
      const regenSimplified = regenTokens.map(simplifyTokens);
      const regenCards = extractCards(regenSimplified);

      console.log(`Regenerated: ${regenCards.length} cards from ${regenTokens.length} blocks`);

      // Step 4: Compare
      const tokenComparison = compareTokenBlocks(originalSimplified, regenSimplified);
      console.log('Token block comparison:', {
        originalBlocks: tokenComparison.totalOriginal,
        regenBlocks: tokenComparison.totalRegenerated,
        formatMismatches: tokenComparison.formatMismatches.length,
        textDiffs: tokenComparison.textDiffs.length,
      });

      const cardComparison = compareCards(originalCards, regenCards);
      console.log('Card comparison:', {
        originalCards: cardComparison.totalOriginal,
        regenCards: cardComparison.totalRegenerated,
        mismatches: cardComparison.mismatches.length,
      });

      if (cardComparison.mismatches.length > 0) {
        console.log('First 5 mismatches:');
        for (const m of cardComparison.mismatches.slice(0, 5)) {
          console.log(`  Card ${m.index} [${m.field}]:`);
          console.log(`    Original:    ${m.original?.slice(0, 100)}`);
          console.log(`    Regenerated: ${m.regenerated?.slice(0, 100)}`);
        }
      }

      // Card count should match exactly
      expect(cardComparison.cardCountMatch).toBe(true);
      // Block-level format should be preserved
      expect(tokenComparison.formatMismatches.length).toBe(0);
    }, 30_000);

    test('markup round-trip preserves structure', async () => {
      const tokens = await documentToTokens(DOCX_PATH);
      const simplified = tokens.map(simplifyTokens);
      const markup = tokensToMarkup(simplified);

      // Markup should contain expected HTML elements
      expect(markup).toContain('<h4>'); // Tags
      expect(markup).toContain('<p>');  // Text blocks
      // Verify it's well-structured (no empty output)
      expect(markup.length).toBeGreaterThan(100);
    }, 15_000);
  } else {
    test('synthetic round-trip: build tokens → docx → re-parse → compare', async () => {
      // Build a synthetic document with known structure
      const syntheticTokens: TextBlock[] = [
        {
          format: 'pocket',
          tokens: [{ text: 'Disadvantage — Spending', format: { underline: false, strong: false, mark: false } }],
        },
        {
          format: 'hat',
          tokens: [{ text: '1NC Shell', format: { underline: false, strong: false, mark: false } }],
        },
        {
          format: 'block',
          tokens: [{ text: 'Uniqueness', format: { underline: false, strong: false, mark: false } }],
        },
        {
          format: 'tag',
          tokens: [{ text: 'Spending is low now — CBO report confirms', format: { underline: false, strong: false, mark: false } }],
        },
        {
          format: 'text',
          tokens: [
            { text: 'Smith 24', format: { underline: false, strong: true, mark: false } },
            { text: ' (John Smith, Senior Fellow at Brookings, "Federal Spending Outlook", CBO Report, 2024)', format: { underline: false, strong: false, mark: false } },
          ],
        },
        {
          format: 'text',
          tokens: [
            { text: 'The federal government is currently operating under tight fiscal constraints.', format: { underline: true, strong: false, mark: false } },
            { text: ' According to the latest analysis, discretionary spending has been held relatively flat in inflation-adjusted terms.', format: { underline: false, strong: false, mark: false } },
            { text: ' This means that any new spending initiative would require offsets or deficit increases.', format: { underline: true, strong: false, mark: true } },
          ],
        },
        {
          format: 'tag',
          tokens: [{ text: 'Link — Plan costs billions in new spending', format: { underline: false, strong: false, mark: false } }],
        },
        {
          format: 'text',
          tokens: [
            { text: 'Johnson 23', format: { underline: false, strong: true, mark: false } },
            { text: ' (Emily Johnson, Policy Analyst, Heritage Foundation, 2023)', format: { underline: false, strong: false, mark: false } },
          ],
        },
        {
          format: 'text',
          tokens: [
            { text: 'The proposed plan would cost approximately $50 billion over the next decade.', format: { underline: true, strong: false, mark: false } },
            { text: ' This estimate includes both direct spending and associated administrative costs that have not been fully accounted for in preliminary scoring.', format: { underline: false, strong: false, mark: false } },
          ],
        },
      ];

      // Step 1: Generate docx from synthetic tokens
      const buffer = await tokensToDocument(syntheticTokens);
      const docxPath = join(tempDir, 'synthetic.docx');
      await fs.writeFile(docxPath, buffer);

      // Step 2: Re-parse the generated docx
      const reparsedTokens = await documentToTokens(docxPath);
      const reparsedSimplified = reparsedTokens.map(simplifyTokens);

      // Step 3: Compare block structure
      const comparison = compareTokenBlocks(syntheticTokens, reparsedSimplified);
      console.log('Synthetic comparison:', {
        originalBlocks: comparison.totalOriginal,
        regeneratedBlocks: comparison.totalRegenerated,
        formatMismatches: comparison.formatMismatches.length,
        textDiffs: comparison.textDiffs.length,
      });

      // Block formats should be preserved
      expect(comparison.blockCountMatch).toBe(true);
      expect(comparison.formatMismatches.length).toBe(0);

      // Extract cards from both
      const originalCards = extractCards(syntheticTokens);
      const regenCards = extractCards(reparsedSimplified);
      const cardComparison = compareCards(originalCards, regenCards);

      console.log('Card comparison:', {
        original: cardComparison.totalOriginal,
        regenerated: cardComparison.totalRegenerated,
      });

      expect(cardComparison.cardCountMatch).toBe(true);
      // Tags should match
      for (const match of cardComparison.matches) {
        expect(match.tagMatch).toBe(true);
      }
    }, 15_000);
  }
});
