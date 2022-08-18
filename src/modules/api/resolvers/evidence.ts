import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';
import { Evidence } from '../models';

@Resolver(Evidence)
export class EvidenceResolver {
  @Query((returns) => Evidence, { nullable: true })
  async evidence(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<Evidence>> {
    return db.evidence.findUnique({ where: { id }, select: selectFields(info) });
  }
}
