import { db } from 'app/lib';
import { selectFields } from 'app/lib/graphql';
import { GraphQLResolveInfo } from 'graphql';
import 'reflect-metadata';
import { Args, ArgsType, Field, Info, Int, Query, Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { File } from '../models';

@ArgsType()
class TagFilesInput {
  @Field((type) => Int)
  take: number;

  @Field((type) => Int, { defaultValue: 0 })
  skip: number;

  @Field((type) => [String], {
    nullable: true,
    defaultValue: [],
    description: 'Files must match every one of these tags',
  })
  every?: string[];

  @Field((type) => [String], {
    nullable: true,
    defaultValue: [],
    description: 'Files must match at least one of these tags',
  })
  some?: string[];
}
const tagSelect = (tags: string[]) => tags?.map((tag) => ({ tags: { some: { name: tag } } }));

@Resolver(File)
export class FileResolver extends createGetResolver('file', File, [
  { name: 'evidence', paginate: true },
  { name: 'tags', paginate: true },
  { name: 'round' },
]) {
  @Query((returns) => [File], { nullable: true })
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
