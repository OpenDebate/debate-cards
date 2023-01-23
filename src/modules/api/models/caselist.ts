import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Caselist as CaselistModel } from '@prisma/client';
import { School } from '.';

@ObjectType()
export class Caselist implements Partial<CaselistModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => ID)
  caselistId: number;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field()
  year: number;

  @Field()
  event: string;

  @Field()
  level: string;

  @Field()
  teamSize: number;

  @Field({ nullable: true })
  archiveUrl?: string;

  @Field((type) => [School])
  schools: School[];
}
