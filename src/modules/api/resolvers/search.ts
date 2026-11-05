import 'reflect-metadata';
import graphqlFields from 'graphql-fields';
import { GraphQLResolveInfo } from 'graphql';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { db } from 'app/lib';
import { selectFromFields } from 'app/lib/graphql';
import { searchForApi } from 'app/modules/search/api';
import { TextField } from 'app/modules/search/mapping';
import { SearchResult } from '../models';
import { SearchEvidenceArgs, SearchableEvidenceField } from '../inputs';

@Resolver()
export class SearchResolver {
  @Query((returns) => SearchResult, {
    description: 'Search cards. Duplicates are collapsed into one hit; the cheapest way to see all versions is hit.evidence.bucket.',
    complexity: ({ args, childComplexity }) => 1000 + args.take * childComplexity,
  })
  async searchEvidence(@Args() args: SearchEvidenceArgs, @Info() info: GraphQLResolveInfo): Promise<SearchResult> {
    const result = await searchForApi({
      query: args.query,
      take: args.take,
      skip: args.skip,
      filters: args.filters,
      fields: args.fields?.map(({ field, weight }) => ({ field: SearchableEvidenceField[field] as TextField, weight: weight ?? 1 })),
      duplicateWeight: args.duplicateWeight,
      facets: args.facets,
      highlight: args.highlight,
    });

    // Cards come from Postgres (the index only holds what is needed to find them); fetch only the fields asked for
    const requested = (graphqlFields(info) as any).hits?.evidence;
    const ids = result.hits.map((hit) => hit.id);
    const cards = new Map<number, any>();
    if (requested && ids.length)
      for (const card of await db.evidence.findMany({ where: { id: { in: ids } }, select: selectFromFields(requested) })) cards.set(card.id, card);

    return {
      total: result.total,
      tookMs: result.tookMs,
      facets: result.facets,
      // A hit whose card has since been deleted is dropped rather than returned empty
      hits: result.hits.flatMap((hit) => {
        const evidence = requested ? cards.get(hit.id) : { id: hit.id };
        return evidence ? [{ evidence, score: hit.score, highlights: hit.highlights }] : [];
      }),
    };
  }
}
