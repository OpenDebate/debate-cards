import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver, ClassType, FieldResolver, Root } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';

export function createGetResolver<T extends ClassType>(
  name: string,
  model: T,
  relationFeilds: (keyof InstanceType<T>)[] = [],
) {
  @Resolver(model, { isAbstract: true })
  abstract class BaseResolver {
    @Query((returns) => model, { name, nullable: true })
    async get(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<T>> {
      return db[name].findUnique({ where: { id }, select: selectFields(info) });
    }
  }

  // Add relation resolvers
  const GetResolver = relationFeilds.reduce((prev, relationFeild) => {
    @Resolver(model, { isAbstract: true })
    abstract class NextResolver extends prev {
      @FieldResolver()
      async [relationFeild](@Root() parent: InstanceType<T>, @Info() info: GraphQLResolveInfo) {
        return db[name].findUnique({ where: { id: parent.id } })[relationFeild]({ select: selectFields(info) });
      }
    }
    return NextResolver;
  }, BaseResolver);

  return GetResolver;
}

export * from './evidence';
export * from './file';
export * from './caselist';
export * from './evidenceBucket';
export * from './tag';
