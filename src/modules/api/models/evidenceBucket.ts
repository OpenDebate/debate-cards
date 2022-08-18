import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { EvidenceBucket as EvidenceBucketSchema } from '@prisma/client';
import { Evidence } from './evidence';

@ObjectType()
export class EvidenceBucket implements Partial<EvidenceBucketSchema> {
  @Field((type) => ID)
  id: number;

  @Field((type) => [Evidence])
  evidence: Evidence[];
}
