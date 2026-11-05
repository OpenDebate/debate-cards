import 'reflect-metadata';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { Evidence } from './evidence';

@ObjectType()
export class SearchHighlight {
  @Field({ description: 'The card field the fragments come from: tag, cite, summary or fulltext' })
  field: string;

  @Field((type) => [String], { description: 'Text with matches wrapped in <mark>...</mark>. Everything else is HTML-escaped.' })
  fragments: string[];
}

@ObjectType()
export class SearchHit {
  @Field((type) => Evidence)
  evidence: Evidence;

  @Field((type) => Float)
  score: number;

  @Field((type) => [SearchHighlight])
  highlights: SearchHighlight[];
}

@ObjectType()
export class FacetBucket {
  @Field({ description: 'The tag to filter on, for example "wikiN" or "2024"' })
  value: string;

  @Field()
  label: string;

  @Field((type) => Int, { description: 'Distinct cards (duplicates counted once) in the current results with this tag' })
  count: number;
}

@ObjectType()
export class SearchFacet {
  @Field()
  name: string;

  @Field((type) => [FacetBucket])
  buckets: FacetBucket[];
}

@ObjectType()
export class SearchResult {
  @Field((type) => Int, { description: 'Distinct cards matching, with duplicates counted once. Exact up to about 40,000, an estimate above that.' })
  total: number;

  @Field((type) => [SearchHit])
  hits: SearchHit[];

  @Field((type) => [SearchFacet])
  facets: SearchFacet[];

  @Field((type) => Int)
  tookMs: number;
}
