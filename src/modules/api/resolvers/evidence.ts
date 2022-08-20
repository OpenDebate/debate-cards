import 'reflect-metadata';
import { Evidence } from '../models';
import { EvidenceSearchArgs, SearchableEvidenceField } from '../inputs';
import { createGetResolver } from '.';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';
import { elastic } from 'app/lib/elastic';
import { flatMap } from 'lodash';
import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';

const EvidenceGetResolver = createGetResolver('evidence', Evidence);

@Resolver()
export class EvidenceResolver extends EvidenceGetResolver {
  @Query((returns) => [Evidence])
  async search(
    @Args() { query, size, fields, tags, duplicateWeight }: EvidenceSearchArgs,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<Evidence>[]> {
    const searchQuery = {
      query_string: {
        query,
        type: 'most_fields', // sums scores from each field
        fields: fields.map(({ field, weight }) => `${SearchableEvidenceField[field]}^${weight}`),
      },
    } as const;
    const duplicateBoost = {
      script_score: {
        script: {
          params: { duplicateWeight },
          source:
            "_score * Math.pow(doc['duplicateCount'].size() == 0 ? 1 : doc['duplicateCount'].value, params.duplicateWeight)",
        },
      },
    } as const;
    const filter = tags
      ? {
          terms_set: {
            'File.tags': {
              terms: tags.map((tag) => tag.toLowerCase()), // For some reason only lowercase works
              // Number of tags matched has to equal number of tags in query
              minimum_should_match_script: { params: { numTags: tags.length }, source: 'params.numTags' },
            },
          },
        }
      : undefined;

    // Does a search in elastic that only returns ids, then queries those ids from postgres
    // Not sure if this is the best approach but otherwise it would be more difficult to do relational queries
    const results = await elastic.search({
      index: 'evidence',
      size,
      query: {
        bool: {
          must: {
            function_score: {
              query: searchQuery,
              functions: [duplicateBoost],
              boost_mode: 'replace',
            },
          },
          filter,
        },
      },
      collapse: { field: 'bucketId' },
      _source: false,
      docvalue_fields: ['id'],
    });

    const ids: number[] = flatMap(results.hits.hits, 'fields.id');
    const evidence = await db.evidence.findMany({ where: { id: { in: ids } }, select: selectFields(info) });
    // Resort results based on ranking
    return evidence.sort((a: { id: number }, b: { id: number }) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }
}
