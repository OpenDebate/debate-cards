import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Evidence as EvidenceSchema } from '@prisma/client';
// import { File } from './file';

@ObjectType()
export class Evidence implements Partial<EvidenceSchema> {
  @Field((type) => ID)
  id: number;

  @Field()
  tag: string;

  @Field({ nullable: true })
  cite: string | null;

  @Field({ nullable: true })
  fullcite: string | null;

  @Field({ nullable: true })
  fulltext: string | null;

  @Field()
  markup: string;

  @Field({ nullable: true })
  pocket: string | null;

  @Field({ nullable: true })
  hat: string | null;

  @Field({ nullable: true })
  block: string | null;

  // @Field({ nullable: true })
  // file: File | null;

  @Field({ nullable: true })
  bucketId: number | null;
}
