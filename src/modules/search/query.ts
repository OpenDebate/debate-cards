import { facetAggregations, FacetDefinition } from './facets';
import { INDEX_ALIAS, TEXT_FIELDS, TextField } from './mapping';

/** The caller sent something we won't run. The message is safe to show to them. */
export class SearchInputError extends Error {}

export const MAX_QUERY_LENGTH = 500;
export const MAX_TAKE = 100;
/** Elasticsearch's default `index.max_result_window`: from + size may not exceed it. */
export const MAX_RESULT_WINDOW = 10_000;
const MAX_FILTER_TAGS = 50;
const MAX_TAG_LENGTH = 200;

/** What matters most to a debater scanning results: the claim (tag), then the author (cite), then the body. */
export const DEFAULT_FIELD_WEIGHTS: Record<TextField, number> = {
  tag: 5,
  cite: 3,
  summary: 2,
  spoken: 2,
  fullcite: 1,
  fulltext: 1,
  pocket: 0.5,
  hat: 0.5,
  block: 0.5,
};

/**
 * How much a card that appears in many rounds is nudged up: score * (1 + weight * ln(copies)). Logarithmic, so a
 * card copied 300 times scores about 2x a unique card at 0.2 instead of drowning better matches. 0 turns it off.
 */
export const DEFAULT_DUPLICATE_WEIGHT = 0.2;

export type SearchFilters = { all?: string[] | null; any?: string[] | null; none?: string[] | null };
export type SearchInput = {
  query?: string | null;
  take: number;
  skip: number;
  filters?: SearchFilters | null;
  fields?: { field: TextField; weight: number }[] | null;
  duplicateWeight?: number | null;
  facets?: boolean;
  highlight?: boolean;
};

export const normaliseQuery = (query?: string | null): string => {
  const text = (query ?? '').replace(/\s+/g, ' ').trim();
  if (text.length > MAX_QUERY_LENGTH) throw new SearchInputError(`The search is too long (at most ${MAX_QUERY_LENGTH} characters).`);
  return text;
};

const cleanTags = (name: string, tags?: string[] | null): string[] => {
  const list = [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  if (list.length > MAX_FILTER_TAGS) throw new SearchInputError(`Too many tags in filters.${name} (at most ${MAX_FILTER_TAGS}).`);
  if (list.some((tag) => tag.length > MAX_TAG_LENGTH)) throw new SearchInputError(`A tag in filters.${name} is too long.`);
  return list;
};

export function buildSearchRequest(input: SearchInput, facets: FacetDefinition[] = []) {
  const query = normaliseQuery(input.query);
  const all = cleanTags('all', input.filters?.all);
  const any = cleanTags('any', input.filters?.any);
  const none = cleanTags('none', input.filters?.none);

  if (!Number.isInteger(input.take) || input.take < 1 || input.take > MAX_TAKE)
    throw new SearchInputError(`take must be between 1 and ${MAX_TAKE}.`);
  if (!Number.isInteger(input.skip) || input.skip < 0) throw new SearchInputError('skip cannot be negative.');
  if (input.skip + input.take > MAX_RESULT_WINDOW)
    throw new SearchInputError(`Only the first ${MAX_RESULT_WINDOW.toLocaleString('en-US')} results can be paged through. Narrow the search with a more specific query or filters.`);
  if (!query && !all.length && !any.length) throw new SearchInputError('Enter a search or choose at least one filter.');

  const weights = input.fields?.length ? input.fields : TEXT_FIELDS.map((field) => ({ field, weight: DEFAULT_FIELD_WEIGHTS[field] }));
  const duplicateWeight = Math.max(0, input.duplicateWeight ?? DEFAULT_DUPLICATE_WEIGHT);

  const textQuery = query
    ? {
        // simple_query_string never fails on what people type: an unbalanced quote or a stray parenthesis is just
        // text. (query_string, used before, threw a parse error for those and leaked it to the client.) Supports
        // "phrases", -exclude, a | b, prefix*, and requires every word unless told otherwise.
        simple_query_string: {
          query,
          fields: weights.map(({ field, weight }) => `${field}^${weight}`),
          default_operator: 'and',
          lenient: true,
        },
      }
    : { match_all: {} };

  const filter: unknown[] = [...all.map((tag) => ({ term: { tags: tag } }))];
  if (any.length) filter.push({ terms: { tags: any } });

  return {
    index: INDEX_ALIAS,
    from: input.skip,
    size: input.take,
    // Only the id is needed; the cards themselves come from Postgres
    _source: ['id'],
    track_total_hits: false,
    query: {
      function_score: {
        query: { bool: { must: [textQuery], filter, must_not: none.length ? [{ terms: { tags: none } }] : [] } },
        script_score: {
          script: {
            source: "_score * (1 + params.weight * Math.log(Math.max(1, doc['duplicateCount'].size() == 0 ? 1 : doc['duplicateCount'].value)))",
            params: { weight: duplicateWeight },
          },
        },
        boost_mode: 'replace',
      },
    },
    // One result per group of duplicate cards (the best scoring version of it)
    collapse: { field: 'groupKey' },
    aggs: {
      groups: { cardinality: { field: 'groupKey', precision_threshold: 40000 } },
      ...(input.facets === false ? {} : facetAggregations(facets)),
    },
    ...(input.highlight === false
      ? {}
      : {
          highlight: {
            // Escapes the card text, so the <mark> tags are the only markup in a fragment
            encoder: 'html',
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
            fields: {
              tag: { number_of_fragments: 0 },
              cite: { number_of_fragments: 0 },
              summary: { fragment_size: 220, number_of_fragments: 1 },
              fulltext: { fragment_size: 220, number_of_fragments: 2 },
            },
          },
        }),
  };
}
