import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Tag as TagSchema } from '@prisma/client';
import { File } from '.';

@ObjectType()
export class Tag implements Partial<TagSchema> {
  @Field((type) => ID)
  id: number;

  @Field()
  name: string;

  @Field()
  label: string;

  @Field((type) => [File])
  files: File[];
}
