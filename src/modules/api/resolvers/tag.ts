import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { Info, Query, Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { Tag } from '../models';

@Resolver(Tag)
export class TagResolver extends createGetResolver('tag', Tag, ['files']) {
  @Query((returns) => [Tag])
  async tags(@Info() info: GraphQLResolveInfo) {
    return db.tag.findMany({ select: selectFields(info) });
  }
}
