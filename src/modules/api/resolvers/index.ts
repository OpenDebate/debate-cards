import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver, ClassType, FieldResolver, Root } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';

type RelationInfo =
  | { paginate?: false; requirePagination?: false; defaultLength?: number }
  | { paginate: true; requirePagination?: false; defaultLength: number }
  | { paginate: true; requirePagination: true; defaultLength?: number };

export function createGetResolver<T extends ClassType>(
  name: string,
  model: T,
  relationFeilds: ({ name: keyof InstanceType<T> } & RelationInfo)[] = [],
) {
  @Resolver(model, { isAbstract: true })
  abstract class BaseResolver {
    @Query((returns) => model, { name, nullable: true })
    async get(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<T>> {
      return db[name].findUnique({ where: { id }, select: selectFields(info) });
    }
  }

  // Add relation resolvers
  return relationFeilds.reduce((prev, { name: relationFeild, paginate, requirePagination, defaultLength }) => {
    if (paginate) {
      @Resolver(model, { isAbstract: true })
      abstract class NextResolver extends prev {
        @FieldResolver({
          complexity: ({ args, childComplexity }) =>
            (args.take ?? defaultLength) * childComplexity + // multiply child by number of nodes requested, or manually set estimate of number of nodes
            (defaultLength + args.skip) * 5, // take arg dosent add a limit clause to sql statement
        })
        async [relationFeild](
          @Arg('take', { nullable: !requirePagination }) take: number,
          @Arg('skip', { defaultValue: 0 }) skip: number,
          @Root() parent: InstanceType<T>,
          @Info() info: GraphQLResolveInfo,
        ) {
          return db[name]
            .findUnique({ where: { id: parent.id }, select: {} })
            [relationFeild]({ skip, take, select: selectFields(info) });
        }
      }
      return NextResolver;
    } else {
      @Resolver(model, { isAbstract: true })
      abstract class NextResolver extends prev {
        @FieldResolver({ complexity: 30 })
        async [relationFeild](@Root() parent: InstanceType<T>, @Info() info: GraphQLResolveInfo) {
          return db[name]
            .findUnique({ where: { id: parent.id }, select: {} })
            [relationFeild]({ select: selectFields(info) });
        }
      }
      return NextResolver;
    }
  }, BaseResolver);
}

export * from './auth';
export * from './evidence';
export * from './file';
export * from './caselist';
export * from './evidenceBucket';
export * from './tag';
