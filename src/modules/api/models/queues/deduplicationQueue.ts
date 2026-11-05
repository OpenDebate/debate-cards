import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class DedupTask {
  @Field()
  gid: string;
}
