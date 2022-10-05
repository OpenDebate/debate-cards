import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Round as RoundModel } from '@prisma/client';
import { File, Team, Cite } from '..';

@ObjectType()
export class Round implements Partial<RoundModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => ID)
  roundId: number;

  @Field()
  side: string;

  @Field()
  tournament: string;

  @Field()
  round: string;

  @Field()
  opponent: string;

  @Field()
  judge: string;

  @Field()
  report: string;

  @Field({ nullable: true })
  opensourcePath?: string;

  @Field((type) => File, { nullable: true })
  opensource?: File;

  @Field({ nullable: true })
  video?: string;

  @Field({ nullable: true })
  tournId?: number;

  @Field({ nullable: true })
  externalId?: number;

  @Field((type) => [Cite])
  cites: Cite[];

  @Field((type) => Team)
  team: Team;
}
