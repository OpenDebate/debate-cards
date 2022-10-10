import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';
import parser from 'app/modules/parser';
import { QueueDataType } from 'app/lib';

@ObjectType()
export class ParseTask implements QueueDataType<typeof parser['queue']> {
  @Field()
  gid: string;
}
