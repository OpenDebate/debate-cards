import { elastic } from 'app/lib/elastic';
import { facetDefinitions, Facet, parseFacets } from './facets';
import { buildSearchRequest, SearchInput, SearchInputError } from './query';

export type SearchHitResult = { id: number; score: number; highlights: { field: string; fragments: string[] }[] };
export type SearchResultData = { total: number; hits: SearchHitResult[]; facets: Facet[]; tookMs: number };

export const SEARCH_UNAVAILABLE = 'Search is temporarily unavailable. Please try again in a moment.';

/** Runs a search. Throws SearchInputError for input the caller can fix, and a plain Error with a safe message for everything else. */
export async function runSearch(input: SearchInput): Promise<SearchResultData> {
  const definitions = input.facets === false ? [] : facetDefinitions();
  const request = buildSearchRequest(input, definitions);
  try {
    const response = await elastic.search(request as any);
    const hits = response.hits.hits.map((hit: any) => ({
      id: Number(hit._source.id),
      score: hit._score ?? 0,
      highlights: Object.entries((hit.highlight ?? {}) as Record<string, string[]>).map(([field, fragments]) => ({ field, fragments })),
    }));
    const aggregations = (response.aggregations ?? {}) as Record<string, any>;
    return { total: aggregations.groups?.value ?? 0, hits, facets: parseFacets(definitions, aggregations), tookMs: response.took };
  } catch (err) {
    if (err instanceof SearchInputError) throw err;
    // Elasticsearch's own message names internal indices and parse positions; log it, show something generic
    console.error('[search] query failed:', JSON.stringify(err?.meta?.body?.error ?? err?.message ?? err).slice(0, 600));
    throw new Error(SEARCH_UNAVAILABLE);
  }
}
