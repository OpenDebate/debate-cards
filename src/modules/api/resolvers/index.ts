import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver, ClassType } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';

export function createGetResolver<T extends ClassType>(name: string, model: T) {
  @Resolver(model, { isAbstract: true })
  abstract class GetResolver {
    @Query((returns) => model, { name, nullable: true })
    async get(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<T>> {
      return db[name].findUnique({ where: { id }, select: selectFields(info) });
    }
  }
  return GetResolver;
}

export * from './evidence';
export * from './file';
