import { IPC_PORT } from 'app/constants';
import type { QueueDataTypes, QueueName } from 'app/lib';
import { queueRequest } from 'app/lib/socket';
import axon from 'pm2-axon';
import { Arg, Authorized, ClassType, Field, FieldResolver, ObjectType, Query, Resolver, Root } from 'type-graphql';
import { CaselistTask, DedupTask, OpenevTask, ParseTask, SchoolTask, TeamTask } from '../models';
const requestSocket = axon.socket('req');
requestSocket.bind(IPC_PORT);

const createQueueResolver = <taskType extends ClassType<QueueDataTypes[N]>, N extends QueueName>(
  taskType: taskType,
  queueName: N,
) => {
  @ObjectType(queueName.charAt(0).toUpperCase() + queueName.slice(1) + 'Queue') // Type name is uppercase of query name
  class QueueType {
    @Field((type) => [taskType])
    tasks: QueueDataTypes[N][];

    @Field((type) => String)
    name: N;

    @Field()
    length: number;
  }

  @Resolver(QueueType, { isAbstract: true })
  abstract class QueueResolver {
    @Query((returns) => QueueType)
    @Authorized('ADMIN')
    async [queueName + 'Queue']() {
      return { name: queueName };
    }

    @FieldResolver()
    async tasks(
      @Arg('take', { nullable: true }) take: number,
      @Arg('skip', { defaultValue: 0 }) skip: number,
    ): Promise<QueueDataTypes[N][]> {
      return queueRequest(requestSocket, { queueName, action: 'tasks', args: { skip, take } });
    }

    @FieldResolver()
    async length(): Promise<number> {
      const length = await queueRequest(requestSocket, { queueName, action: 'length' }, 1000);
      // IPC library turns 0 into null :)
      return length ?? 0;
    }
  }
  return QueueResolver;
};

@Resolver()
class ParseQueueResolver extends createQueueResolver(ParseTask, 'parse') {}

@Resolver()
class DedupQueueResolver extends createQueueResolver(DedupTask, 'dedup') {}

@Resolver()
class OpenevQueueResolver extends createQueueResolver(OpenevTask, 'openev') {}

@Resolver()
class CaselistQueueResolver extends createQueueResolver(CaselistTask, 'caselist') {}

@Resolver()
class SchoolQueueResolver extends createQueueResolver(SchoolTask, 'school') {}

@Resolver()
class TeamQueueResolver extends createQueueResolver(TeamTask, 'team') {}

export const QueueResolvers = [
  ParseQueueResolver,
  DedupQueueResolver,
  OpenevQueueResolver,
  CaselistQueueResolver,
  SchoolQueueResolver,
  TeamQueueResolver,
];
