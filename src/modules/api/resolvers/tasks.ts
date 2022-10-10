import { IPC_PORT } from 'app/constants';
import { ipcRequest } from 'app/lib/socket';
import axon from 'pm2-axon';
import { Authorized, ClassType, Field, FieldResolver, ObjectType, Query, Resolver, Root } from 'type-graphql';
import { CaselistTask, DedupTask, OpenevTask, ParseTask, SchoolTask, TeamTask } from '../models';
const requestSocket = axon.socket('req');
requestSocket.bind(IPC_PORT);

const createQueueResolver = <taskType extends ClassType>(taskType: taskType, queryName: string, queueName: string) => {
  @ObjectType(queryName.charAt(0).toUpperCase() + queryName.slice(1)) // Type name is uppercase of query name
  class QueueType {
    @Field((type) => [taskType])
    tasks: InstanceType<taskType>[];

    @Field()
    length: number;
  }

  @Resolver(QueueType, { isAbstract: true })
  abstract class QueueResolver {
    @Query((returns) => QueueType)
    @Authorized('ADMIN')
    async [queryName](): Promise<Partial<InstanceType<typeof QueueType>>> {
      const tasks = await ipcRequest<InstanceType<taskType>[]>({
        socket: requestSocket,
        message: [queueName],
        timeout: 1000,
      });
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
class ParseQueueResolver extends createQueueResolver(ParseTask, 'parseQueue', 'parsing') {}

@Resolver()
class DedupQueueResolver extends createQueueResolver(DedupTask, 'dedupQueue', 'deduplication') {}

@Resolver()
class OpenevQueueResolver extends createQueueResolver(OpenevTask, 'openevQueue', 'openev') {}

@Resolver()
class CaselistQueueResolver extends createQueueResolver(CaselistTask, 'caselistQueue', 'caselist') {}

@Resolver()
class SchoolQueueResolver extends createQueueResolver(SchoolTask, 'schoolQueue', 'school') {}

@Resolver()
class TeamQueueResolver extends createQueueResolver(TeamTask, 'teamQueue', 'team') {}

export const QueueResolvers = [
  ParseQueueResolver,
  DedupQueueResolver,
  OpenevQueueResolver,
  CaselistQueueResolver,
  SchoolQueueResolver,
  TeamQueueResolver,
];
