import 'reflect-metadata';
import { Evidence } from '../models';
import { createGetResolver } from '.';
import { Args, ArgsType, Field, Info, Query, Resolver } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';
import { elastic } from 'app/lib/elastic';
import { flatMap } from 'lodash';
import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';

const EvidenceGetResolver = createGetResolver('evidence', Evidence);

@ArgsType()
class EvidenceSearchArgs {
  @Field()
  query: string;
}

@Resolver()
export class EvidenceResolver extends EvidenceGetResolver {
  // A lot of things are hard coded at the moment, in the future could be made customizable
  @Query((returns) => [Evidence])
  async search(@Args() { query }: EvidenceSearchArgs, @Info() info: GraphQLResolveInfo): Promise<Partial<Evidence>[]> {
    // Does a search in elastic that only returns ids, then queries those ids from postgres
    // Not sure if this is the best approach but otherwise it would be more difficult to do relational queries
    console.time('search');
    const results = await elastic.search({
      index: 'evidence',
      query: {
        query_string: {
          query,
          type: 'most_fields', // sums scores from each field
          fields: ['tag^2', 'fullcite', 'fulltext'],
        },
      },
      collapse: {
        field: 'bucketId',
      },
      _source: false,
      docvalue_fields: ['id'],
    });
    console.timeEnd('search');
    const ids: number[] = flatMap(results.hits.hits, 'fields.id');
    return await db.evidence.findMany({ where: { id: { in: ids } }, select: selectFields(info) });
  }
}
