import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Tags as TagSchema } from '@prisma/client';

@ObjectType()
export class Tag implements Partial<TagSchema> {
  @Field((type) => ID)
  id: number;

  @Field()
  name: string;

  @Field()
  label: string;
}
