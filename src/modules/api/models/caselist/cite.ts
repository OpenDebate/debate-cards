import 'reflect-metadata';
import { Field, ID, ObjectType } from 'type-graphql';
import { Cite as CitesModel } from '@prisma/client';
import { Round } from '.';

@ObjectType()
export class CiteBase implements Partial<CitesModel> {
  @Field((type) => ID)
  citeId: number;

  @Field()
  title: string;

  @Field({ complexity: 20 })
  cites: string;
}

@ObjectType()
export class Cite extends CiteBase implements Partial<CitesModel> {
  @Field((type) => ID)
  id: number;

  @Field((type) => Round)
  round: Round;
}
