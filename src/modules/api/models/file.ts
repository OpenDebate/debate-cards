import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { File as FileSchema } from '@prisma/client';
import { Tag, Evidence, Round } from '.';

@ObjectType()
export class File implements Partial<FileSchema> {
  @Field((type) => ID)
  id: number;

  @Field()
  name: string;

  @Field((type) => [Evidence])
  evidence: Evidence[];

  @Field((type) => Round, { nullable: true })
  round?: Round;

  @Field((type) => [Tag])
  tags: Tag[];
}
