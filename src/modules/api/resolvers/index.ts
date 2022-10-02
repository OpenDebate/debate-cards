import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver, ClassType, FieldResolver, Root } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';

export function createGetResolver<T extends ClassType>(
  name: string,
  model: T,
  relationFeilds: { name: keyof InstanceType<T>; paginate?: boolean; requirePagination?: boolean }[] = [],
) {
  @Resolver(model, { isAbstract: true })
  abstract class BaseResolver {
    @Query((returns) => model, { name, nullable: true })
    async get(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<T>> {
      return db[name].findUnique({ where: { id }, select: selectFields(info) });
    }
  }

  // Add relation resolvers
  const GetResolver = relationFeilds.reduce((prev, { name: relationFeild, paginate, requirePagination }) => {
    if (paginate) {
      @Resolver(model, { isAbstract: true })
      abstract class NextResolver extends prev {
        @FieldResolver()
        async [relationFeild](
          @Arg('take', { nullable: !requirePagination }) take: number,
          @Arg('skip', { defaultValue: 0 }) skip: number,
          @Root() parent: InstanceType<T>,
          @Info() info: GraphQLResolveInfo,
        ) {
          return db[name]
            .findUnique({ where: { id: parent.id } })
            [relationFeild]({ skip, take, select: selectFields(info) });
        }
      }
      return NextResolver;
    } else {
      @Resolver(model, { isAbstract: true })
      abstract class NextResolver extends prev {
        @FieldResolver()
        async [relationFeild](@Root() parent: InstanceType<T>, @Info() info: GraphQLResolveInfo) {
          return db[name].findUnique({ where: { id: parent.id } })[relationFeild]({ select: selectFields(info) });
        }
      }
      return NextResolver;
    }
  }, BaseResolver);

  return GetResolver;
}

export * from './auth';
export * from './evidence';
export * from './file';
export * from './caselist';
export * from './evidenceBucket';
export * from './tag';
