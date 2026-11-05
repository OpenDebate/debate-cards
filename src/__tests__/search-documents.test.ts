import { groupKeyFor, toDoc, EvidenceRow } from 'app/modules/search/documents';
import { indexMappings, indexSettings, TEXT_FIELDS } from 'app/modules/search/mapping';

const row = (overrides: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: 7,
  gid: 'ABC123',
  tag: 'Deterrence fails',
  cite: 'Walt 20',
  fullcite: 'Walt, Harvard, 2020',
  summary: null,
  spoken: null,
  fulltext: 'Some text.',
  pocket: null,
  hat: null,
  block: null,
  bucketId: null,
  bucket: null,
  file: null,
  ...overrides,
});

describe('groupKeyFor', () => {
  test('cards in the same bucket share a key', () => {
    expect(groupKeyFor(1, 12)).toBe('b12');
    expect(groupKeyFor(2, 12)).toBe('b12');
  });
  test('a card with no bucket is its own group, and never collides with a bucket of the same number', () => {
    expect(groupKeyFor(12, null)).toBe('c12');
    expect(groupKeyFor(12, null)).not.toBe(groupKeyFor(5, 12));
  });
});

describe('toDoc', () => {
  test('ungrouped card without a file', () => {
    expect(toDoc(row())).toMatchObject({ id: 7, groupKey: 'c7', bucketId: null, duplicateCount: 1, tags: [] });
  });
  test('takes copy count from the bucket and tag names from the file', () => {
    const doc = toDoc(row({ bucketId: 3, bucket: { count: 30 }, file: { tags: [{ name: 'wiki' }, { name: 'hspolicy24' }] } }));
    expect(doc).toMatchObject({ groupKey: 'b3', duplicateCount: 30, tags: ['wiki', 'hspolicy24'] });
  });
  test('a bucket row that has not been counted yet still counts as one copy', () => {
    expect(toDoc(row({ bucketId: 3, bucket: { count: 0 } })).duplicateCount).toBe(1);
  });
  test('has exactly the fields the strict mapping allows, so Elasticsearch will not reject it', () => {
    const allowed = Object.keys(indexMappings.properties).sort();
    expect(Object.keys(toDoc(row())).sort()).toEqual(allowed);
  });
});

describe('index definition', () => {
  const analyzerFilters = indexSettings.analysis.analyzer.debate_text.filter;
  test('stems and folds accents', () => {
    expect(analyzerFilters).toContain('english_stem');
    expect(analyzerFilters).toContain('asciifolding');
  });
  test('keeps "no" and "not": no stop word filter', () => {
    expect(analyzerFilters.some((name) => /stop/i.test(name))).toBe(false);
  });
  test('every searchable text field uses the analyzer', () => {
    for (const field of TEXT_FIELDS) expect((indexMappings.properties as any)[field]).toMatchObject({ type: 'text', analyzer: 'debate_text' });
  });
  test('markup is not indexed', () => {
    expect(Object.keys(indexMappings.properties)).not.toContain('markup');
  });
});
