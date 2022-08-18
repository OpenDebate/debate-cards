import 'reflect-metadata';
import { db } from 'app/lib/db';
import { selectFields } from 'app/lib/graphql';
import { Arg, Info, Query, Resolver } from 'type-graphql';
import { GraphQLResolveInfo } from 'graphql';
import { File } from '../models';

@Resolver(File)
export class FileResolver {
  @Query((returns) => File, { nullable: true })
  async file(@Arg('id') id: number, @Info() info: GraphQLResolveInfo): Promise<Partial<File>> {
    return db.file.findUnique({ where: { id }, select: selectFields(info) });
  }
}
