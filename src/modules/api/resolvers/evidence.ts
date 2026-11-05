import 'reflect-metadata';
import { Evidence } from '../models';
import { EvidenceSearchArgs, SearchableEvidenceField } from '../inputs';
import { createGetResolver } from '.';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';
import { searchForApi } from 'app/modules/search/api';
import { TextField } from 'app/modules/search/mapping';
import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';

@Resolver(Evidence)
export class EvidenceResolver extends createGetResolver('evidence', Evidence, [{ name: 'file' }, { name: 'bucket' }]) {
  @Query((returns) => [Evidence], {
    deprecationReason: 'Use searchEvidence, which also returns totals, facets and highlights',
    complexity: ({ args, childComplexity }) => 1000 + args.take * childComplexity,
  })
  async search(
    @Args() { query, take, skip, fields, tags, duplicateWeight }: EvidenceSearchArgs,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Evidence>[]> {
    const result = await searchForApi({
      query,
      take,
      skip,
      filters: { all: tags },
      fields: fields?.map(({ field, weight }) => ({ field: SearchableEvidenceField[field] as TextField, weight: weight ?? 1 })),
      duplicateWeight,
      facets: false,
      highlight: false,
    });

    const ids = result.hits.map((hit) => hit.id);
    const evidence = await db.evidence.findMany({ where: { id: { in: ids } }, select: selectFields(info) });
    // Resort results based on ranking
    return evidence.sort((a: { id: number }, b: { id: number }) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }
}
