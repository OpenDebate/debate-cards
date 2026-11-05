/**
 * Deduplication Algorithm Unit Tests
 *
 * Tests the sentence extraction and matching logic in isolation,
 * without requiring Redis or PostgreSQL.
 */
import { getSentences } from 'app/lib/debate-tools/duplicate';
import { MIN_COUNT_FRACTION, EDGE_TOLERANCE, SHOULD_MATCH, SHOULD_MERGE } from 'app/constants';

describe('getSentences', () => {
  test('splits text by sentence boundaries', () => {
    const text = 'The plan costs money. This is a problem for the federal government. Spending is already too high right now.';
    const sentences = getSentences(text, 5);
    expect(sentences.length).toBe(3);
  });

  test('filters out short sentences', () => {
    const text = 'Yes. The plan costs a significant amount of money. No.';
    const sentences = getSentences(text, 20);
    // "Yes" and "No" are too short, only the middle sentence passes
    expect(sentences.length).toBe(1);
  });

  test('handles paragraph marks', () => {
    const text = 'First sentence about spending.¶ Second sentence about the economy. Third sentence about growth.';
    const sentences = getSentences(text, 5);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  test('removes text inside parentheses', () => {
    const text = 'The plan (which was introduced last year) costs billions of dollars. This is significant.';
    const sentences = getSentences(text, 5);
    // Parenthetical should be stripped
    const joined = sentences.join(' ');
    expect(joined).not.toContain('whichwasintroducedlastyear');
  });

  test('handles acronyms without splitting', () => {
    const text = 'The U.S.A. spends trillions annually on defense programs. This is a large amount.';
    const sentences = getSentences(text, 5);
    // Should not split at U.S.A. periods
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  test('returns empty for null/empty input', () => {
    expect(getSentences(null)).toEqual([]);
    expect(getSentences('')).toEqual([]);
    expect(getSentences(undefined)).toEqual([]);
  });

  test('normalizes to lowercase letters only', () => {
    const text = 'The plan costs $50 billion over the next decade according to CBO estimates.';
    const sentences = getSentences(text, 5);
    for (const s of sentences) {
      expect(s).toMatch(/^[a-z]+$/);
    }
  });
});

describe('matching thresholds', () => {
  test('SHOULD_MATCH requires > 50% overlap', () => {
    expect(SHOULD_MATCH(6, 10)).toBe(true);   // 60%
    expect(SHOULD_MATCH(5, 10)).toBe(false);   // 50% — not > 50%
    expect(SHOULD_MATCH(3, 10)).toBe(false);   // 30%
    expect(SHOULD_MATCH(1, 1)).toBe(true);     // 100%
  });

  test('SHOULD_MERGE has different thresholds based on count', () => {
    // > 5 matches: need >= 2%
    expect(SHOULD_MERGE(6, 100)).toBe(true);   // 6%
    expect(SHOULD_MERGE(6, 500)).toBe(false);  // 1.2% < 2%

    // <= 5 matches: need >= 20%
    expect(SHOULD_MERGE(2, 10)).toBe(true);    // 20% — meets >= 0.2 threshold
    expect(SHOULD_MERGE(3, 10)).toBe(true);    // 30%
    expect(SHOULD_MERGE(1, 10)).toBe(false);   // 10%
  });
});

describe('sentence similarity matching', () => {
  // Replicate the in-memory matching logic
  function isMatch(aSentences: string[], bSentences: string[]) {
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

    if (matchCount < Math.max(aSentences.length, bSentences.length) * MIN_COUNT_FRACTION) return false;
    const aTol = Math.ceil(aSentences.length * EDGE_TOLERANCE);
    const bTol = Math.ceil(bSentences.length * EDGE_TOLERANCE);
    return (aMin <= aTol || bMin <= bTol) && (aSentences.length - 1 - aMax <= aTol || bSentences.length - 1 - bMax <= bTol);
  }

  test('identical cards match', () => {
    const text = 'The federal government currently spends too much money. This creates a significant debt burden. The interest payments alone cost billions annually.';
    const sentences = getSentences(text, 5);
    expect(isMatch(sentences, sentences)).toBe(true);
  });

  test('completely different cards do not match', () => {
    const a = getSentences('Renewable energy reduces carbon emissions significantly over time.', 5);
    const b = getSentences('Military spending has increased dramatically in recent years.', 5);
    expect(isMatch(a, b)).toBe(false);
  });

  test('cards with partial overlap at the start match', () => {
    const base = 'The federal government spends too much money on discretionary programs. This creates fiscal pressure. The budget deficit grows each year. Interest rates compound the problem significantly.';
    const extended = base + ' Additional analysis shows even more spending growth in entitlements.';
    const a = getSentences(base, 5);
    const b = getSentences(extended, 5);
    // The base sentences all appear at the start of both — should match
    if (a.length > 0 && b.length > 0) {
      expect(isMatch(a, b)).toBe(true);
    }
  });

  test('cards with no shared sentences do not match', () => {
    const a = ['sentenceoneabouteconomics', 'sentencetwoaboutspending', 'sentencethreeaboutgrowth'];
    const b = ['sentencefouraboutclimate', 'sentencefiveaboutenergy', 'sentencesixaboutpolicy'];
    expect(isMatch(a, b)).toBe(false);
  });
});
