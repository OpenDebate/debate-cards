import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class ParseTask {
  @Field()
  gid: string;
}
