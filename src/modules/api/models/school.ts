import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { School as SchoolModel } from '@prisma/client';
import { Team, Caselist } from '.';

@ObjectType()
export class School implements Partial<SchoolModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => ID)
  schoolId: number;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  chapterId?: number;

  @Field((type) => [Team])
  teams: Team[];

  @Field((type) => Caselist)
  caselist: Caselist;
}
