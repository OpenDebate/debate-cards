import 'reflect-metadata';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Evidence as EvidenceSchema } from '@prisma/client';
import { File as FileModel } from './file';
import { EvidenceBucket } from './evidenceBucket';

@ObjectType()
export class Evidence implements Partial<EvidenceSchema> {
  @Field((type) => ID)
  id: number;

  @Field()
  tag: string;

  @Field({ nullable: true })
  cite?: string;

  @Field({ nullable: true })
  fullcite?: string;

  @Field({ nullable: true, complexity: 10 })
  fulltext?: string;

  @Field({ complexity: 15 })
  markup: string;

  @Field({ nullable: true })
  pocket?: string;

  @Field({ nullable: true })
  hat?: string;

  @Field({ nullable: true })
  block?: string;

  @Field({ nullable: true })
  file?: FileModel;

  @Field((type) => EvidenceBucket, { nullable: true })
  bucket?: EvidenceBucket;
}
