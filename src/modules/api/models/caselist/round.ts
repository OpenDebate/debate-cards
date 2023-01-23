import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Round as RoundModel } from '@prisma/client';
import { File, Team, Cite } from '..';

@ObjectType()
export class RoundBase implements Partial<RoundModel> {
  @Field((type) => ID)
  roundId: number;

  @Field()
  side: string;

  @Field()
  tournament: string;

  @Field()
  round: string;

  @Field({ nullable: true })
  opponent?: string;

  @Field({ nullable: true })
  judge?: string;

  @Field({ nullable: true })
  report?: string;

  @Field({ nullable: true })
  opensourcePath?: string;

  @Field({ nullable: true })
  video?: string;

  @Field({ nullable: true })
  tournId?: number;

  @Field({ nullable: true })
  externalId?: number;
}

@ObjectType()
export class Round extends RoundBase implements Partial<RoundModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => File, { nullable: true })
  opensource?: File;

  @Field((type) => [Cite])
  cites: Cite[];

  @Field((type) => Team)
  team: Team;
}
