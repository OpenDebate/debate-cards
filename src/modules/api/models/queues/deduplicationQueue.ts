import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';
import deduplication from 'app/modules/deduplicator';
import { QueueDataType } from 'app/lib';

@ObjectType()
export class DedupTask implements QueueDataType<typeof deduplication['queue']> {
  @Field()
  gid: string;
}
