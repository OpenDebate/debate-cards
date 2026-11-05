import { facetDefinitions, parseFacets } from 'app/modules/search/facets';
import {
  buildSearchRequest,
  DEFAULT_DUPLICATE_WEIGHT,
  MAX_QUERY_LENGTH,
  MAX_RESULT_WINDOW,
  normaliseQuery,
  SearchInput,
  SearchInputError,
} from 'app/modules/search/query';

const base = (overrides: Partial<SearchInput> = {}): SearchInput => ({ query: 'nuclear war', take: 10, skip: 0, ...overrides });
const build = (overrides: Partial<SearchInput> = {}) => buildSearchRequest(base(overrides), facetDefinitions());
const bool = (request: ReturnType<typeof build>) => request.query.function_score.query.bool;

describe('query text', () => {
  test('uses the forgiving parser, never the strict one that threw on odd input', () => {
    const json = JSON.stringify(build());
    expect(json).toContain('simple_query_string');
    expect(json).not.toMatch(/"query_string"/);
  });
  test('requires every word, and is lenient about field types', () => {
    expect(bool(build()).must[0]).toMatchObject({ simple_query_string: { query: 'nuclear war', default_operator: 'and', lenient: true } });
  });
  test.each(['"unbalanced quote', 'a OR', '(', 'foo AND', 'war/peace', 'AT: spec', 'C++', '\\', '*', '%00', 'a'.repeat(MAX_QUERY_LENGTH)])(
    'passes %p through untouched instead of throwing',
    (query) => {
      expect(bool(build({ query })).must[0]).toMatchObject({ simple_query_string: { query } });
    },
  );
  test('collapses whitespace and trims', () => {
    expect(normaliseQuery('  nuclear \n\t war  ')).toBe('nuclear war');
  });
  test('rejects an over-long query with a message the user can act on', () => {
    expect(() => build({ query: 'a'.repeat(MAX_QUERY_LENGTH + 1) })).toThrow(SearchInputError);
    expect(() => build({ query: 'a'.repeat(MAX_QUERY_LENGTH + 1) })).toThrow(/too long/);
  });
  test('weights the claim above the cite above the body by default', () => {
    const fields: string[] = (bool(build()).must[0] as any).simple_query_string.fields;
    const weight = (name: string) => Number(fields.find((f) => f.startsWith(`${name}^`))?.split('^')[1]);
    expect(weight('tag')).toBeGreaterThan(weight('cite'));
    expect(weight('cite')).toBeGreaterThan(weight('fulltext'));
  });
  test('caller-supplied field weights replace the defaults', () => {
    const fields = (bool(build({ fields: [{ field: 'fulltext', weight: 4 }] })).must[0] as any).simple_query_string.fields;
    expect(fields).toEqual(['fulltext^4']);
  });
});

describe('filters', () => {
  test('all: one exact term per tag, so every tag must match', () => {
    expect(bool(build({ filters: { all: ['wiki', 'hspolicy24'] } })).filter).toEqual([{ term: { tags: 'wiki' } }, { term: { tags: 'hspolicy24' } }]);
  });
  test('any: matches at least one', () => {
    expect(bool(build({ filters: { any: ['wikiA', 'wikiN'] } })).filter).toEqual([{ terms: { tags: ['wikiA', 'wikiN'] } }]);
  });
  test('none: excluded', () => {
    expect(bool(build({ filters: { none: ['openev'] } })).must_not).toEqual([{ terms: { tags: ['openev'] } }]);
  });
  test('tags keep their case: they are exact-match keywords and "GDI" is not "gdi"', () => {
    expect(bool(build({ filters: { all: ['GDI'] } })).filter).toEqual([{ term: { tags: 'GDI' } }]);
  });
  test('blank and repeated tags are dropped', () => {
    expect(bool(build({ filters: { all: [' wiki ', 'wiki', ''] } })).filter).toEqual([{ term: { tags: 'wiki' } }]);
  });
  test('filters alone are enough to browse', () => {
    const request = build({ query: '   ', filters: { all: ['openev'] } });
    expect(bool(request).must[0]).toEqual({ match_all: {} });
  });
  test('neither a query nor a filter is an input error', () => {
    expect(() => build({ query: ' ' })).toThrow(/Enter a search or choose at least one filter/);
    expect(() => build({ query: '', filters: { none: ['openev'] } })).toThrow(SearchInputError); // excluding alone is not a search
  });
  test('absurd filter lists are refused', () => {
    expect(() => build({ filters: { all: Array.from({ length: 51 }, (_, i) => `t${i}`) } })).toThrow(/Too many tags/);
    expect(() => build({ filters: { all: ['x'.repeat(201)] } })).toThrow(/too long/);
  });
});

describe('paging', () => {
  test('from and size', () => {
    expect(build({ take: 25, skip: 50 })).toMatchObject({ from: 50, size: 25 });
  });
  test.each([[0], [101], [1.5], [-1]])('take %p is refused', (take) => {
    expect(() => build({ take })).toThrow(SearchInputError);
  });
  test('skip cannot be negative', () => {
    expect(() => build({ skip: -1 })).toThrow(/skip/);
  });
  test('the last reachable page is accepted and one more result is not, with a plain explanation', () => {
    expect(() => build({ take: 10, skip: MAX_RESULT_WINDOW - 10 })).not.toThrow();
    expect(() => build({ take: 10, skip: MAX_RESULT_WINDOW - 9 })).toThrow(/first 10,000 results/);
  });
});

describe('ranking and grouping', () => {
  test('collapses duplicates on the group key and counts distinct groups', () => {
    const request = build();
    expect(request.collapse).toEqual({ field: 'groupKey' });
    expect(request.aggs.groups.cardinality.field).toBe('groupKey');
  });
  test('duplicate boost is logarithmic with a modest default, and can be turned off', () => {
    const script = (request: ReturnType<typeof build>) => request.query.function_score.script_score.script;
    expect(script(build()).source).toContain('Math.log');
    expect(script(build()).params.weight).toBe(DEFAULT_DUPLICATE_WEIGHT);
    expect(script(build({ duplicateWeight: 0 })).params.weight).toBe(0);
    expect(script(build({ duplicateWeight: -3 })).params.weight).toBe(0);
  });
  test('only the id comes back from the index', () => {
    expect(build()._source).toEqual(['id']);
  });
});

describe('optional parts', () => {
  test('facets and highlights are on by default and can be left out', () => {
    expect(Object.keys(build().aggs)).toEqual(expect.arrayContaining(['groups', 'facet_year', 'facet_side']));
    expect(build()).toHaveProperty('highlight');
    const lean = build({ facets: false, highlight: false });
    expect(Object.keys(lean.aggs)).toEqual(['groups']);
    expect(lean).not.toHaveProperty('highlight');
  });
  test('highlight output is HTML-escaped so only the <mark> tags are markup', () => {
    expect((build() as any).highlight).toMatchObject({ encoder: 'html', pre_tags: ['<mark>'], post_tags: ['</mark>'] });
  });
});

describe('parseFacets', () => {
  const definitions = facetDefinitions();
  const agg = (buckets: [string, number][]) => ({ buckets: buckets.map(([key, count]) => ({ key, doc_count: count * 3, groups: { value: count } })) });
  test('counts distinct cards, labels them, sorts by count and drops empty facets', () => {
    const facets = parseFacets(definitions, {
      facet_side: agg([
        ['wikiA', 5],
        ['wikiN', 9],
      ]),
      facet_year: agg([['2024', 14]]),
      facet_camp: { buckets: [] },
    });
    expect(facets.map((f) => f.name)).toEqual(['side', 'year']);
    expect(facets[0].buckets).toEqual([
      { value: 'wikiN', label: 'Negative', count: 9 },
      { value: 'wikiA', label: 'Affirmative', count: 5 },
    ]);
  });
  test('no aggregations at all (facets switched off) gives no facets', () => {
    expect(parseFacets([], undefined)).toEqual([]);
  });
});
