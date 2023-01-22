import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';
import { GraphQLResolveInfo } from 'graphql';
import 'reflect-metadata';
import { Args, Info, Query, Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { File } from '../models';
import { TagFilesInput } from '../inputs';

const tagSelect = (tags: string[]) => tags?.map((tag) => ({ tags: { some: { name: tag } } }));

@Resolver(File)
export class FileResolver extends createGetResolver('file', File, [
  { name: 'evidence', paginate: true, defaultLength: 50 },
  { name: 'tags', paginate: true, defaultLength: 10 },
  { name: 'round' },
]) {
  @Query((returns) => [File], {
    nullable: true,
    complexity: ({ args, childComplexity }) => 500 + args.take * childComplexity,
  })
  async tagFiles(
    @Args() { take, skip, every, some }: TagFilesInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<Partial<File>[]> {
    return db.file.findMany({
      take,
      skip,
      where: { AND: tagSelect(every), OR: tagSelect(some) },
      select: selectFields(info),
    });
  }
}
