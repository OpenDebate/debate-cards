import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Team as TeamModel } from '@prisma/client';
import { Round, School } from '.';

@ObjectType()
export class Team implements Partial<TeamModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => ID)
  teamId: number;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  debater1First: string;

  @Field()
  debater1Last: string;

  @Field({ nullable: true })
  debater1StudentId?: number;

  @Field({ nullable: true })
  debater2First?: string;

  @Field({ nullable: true })
  debater2Last?: string;

  @Field({ nullable: true })
  debater2StudentId?: number;

  @Field({ nullable: true })
  debater3First?: string;

  @Field({ nullable: true })
  debater3Last?: string;

  @Field({ nullable: true })
  debater3StudentId?: number;

  @Field({ nullable: true })
  debater4First?: string;

  @Field({ nullable: true })
  debater4Last?: string;

  @Field({ nullable: true })
  debater4StudentId?: number;

  @Field((type) => [Round])
  rounds: Round[];

  @Field((type) => School)
  school: School;
}
