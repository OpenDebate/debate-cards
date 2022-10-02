import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Cite as CitesModel } from '@prisma/client';
import { Round } from '.';

@ObjectType()
export class Cite implements Partial<CitesModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => ID)
  citeId: number;

  @Field()
  title: string;

  @Field({ complexity: 20 })
  cites: string;

  @Field((type) => Round)
  round: Round;
}
