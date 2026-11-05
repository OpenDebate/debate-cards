import { CAMP_NAMES, EVENT_NAMES, OPENEV_TYPES } from 'app/constants/caselistNames';

/*
  Facets are counts of matching cards per tag, for tags a UI wants as filters. A card's tags are one flat list, so
  each facet names the tag values that belong to it. Counts are distinct duplicate groups, matching what the result
  list shows, not raw cards.
*/
export type FacetDefinition = { name: string; values: Record<string, string> };

const years = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let year = new Date().getFullYear() + 1; year >= 2010; year--) out[String(year)] = String(year);
  return out;
};

export const facetDefinitions = (): FacetDefinition[] => [
  { name: 'source', values: { wiki: 'Wiki', openev: 'Open Evidence' } },
  { name: 'side', values: { wikiA: 'Affirmative', wikiN: 'Negative' } },
  { name: 'level', values: { hs: 'High school', college: 'College' } },
  { name: 'event', values: EVENT_NAMES },
  { name: 'year', values: years() },
  { name: 'camp', values: CAMP_NAMES },
  { name: 'openevType', values: OPENEV_TYPES },
];

export type Facet = { name: string; buckets: { value: string; label: string; count: number }[] };

export const facetAggregations = (definitions: FacetDefinition[]) =>
  Object.fromEntries(
    definitions.map(({ name, values }) => [
      `facet_${name}`,
      {
        terms: { field: 'tags', include: Object.keys(values), size: Object.keys(values).length },
        aggs: { groups: { cardinality: { field: 'groupKey', precision_threshold: 1000 } } },
      },
    ]),
  );

export const parseFacets = (definitions: FacetDefinition[], aggregations: Record<string, any> = {}): Facet[] =>
  definitions
    .map(({ name, values }) => ({
      name,
      buckets: ((aggregations[`facet_${name}`]?.buckets ?? []) as any[])
        .map((bucket) => ({ value: String(bucket.key), label: values[bucket.key] ?? String(bucket.key), count: bucket.groups?.value ?? 0 }))
        .filter((bucket) => bucket.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    }))
    .filter((facet) => facet.buckets.length > 0);
