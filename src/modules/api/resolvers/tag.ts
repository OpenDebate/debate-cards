import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { Info, Query, Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { Tag } from '../models';

const TagGetResolver = createGetResolver('tag', Tag);

@Resolver()
export class TagResolver extends TagGetResolver {
  @Query((returns) => [Tag])
  async tags(@Info() info: GraphQLResolveInfo) {
    return db.tag.findMany({ select: selectFields(info) });
  }
}
