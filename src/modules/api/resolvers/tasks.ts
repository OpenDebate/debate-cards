import { IPC_PORT } from 'app/constants';
import type { QueueDataTypes, QueueName } from 'app/lib';
import { queueRequest } from 'app/lib/socket';
import axon from 'pm2-axon';
import { Authorized, ClassType, Field, FieldResolver, ObjectType, Query, Resolver, Root } from 'type-graphql';
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

    @Field()
    length: number;
  }

  @Resolver(QueueType, { isAbstract: true })
  abstract class QueueResolver {
    @Query((returns) => QueueType)
    @Authorized('ADMIN')
    async [queueName + 'Queue'](): Promise<Partial<InstanceType<typeof QueueType>>> {
      const tasks = await queueRequest(requestSocket, { queueName });
      return { tasks };
    }
    @FieldResolver()
    async length(@Root() parent: InstanceType<typeof QueueType>): Promise<number> {
      return parent.tasks.length;
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
