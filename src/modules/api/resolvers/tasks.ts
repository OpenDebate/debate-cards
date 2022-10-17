import { IPC_PORT } from 'app/constants';
import type { QueueDataTypes, QueueLoadArgs, QueueName } from 'app/lib';
import { queueRequest } from 'app/lib/socket';
import axon from 'pm2-axon';
import { Arg, Args, Authorized, Field, FieldResolver, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { QueueModels } from '../models';
const requestSocket = axon.socket('req');
requestSocket.bind(IPC_PORT);

@ObjectType()
class LoadResults {
  @Field()
  size: number;
}

const createQueueResolver = <N extends QueueName>(queueName: N) => {
  const { taskType, loadInput } = QueueModels[queueName];
  const capitalizedQueueName = queueName.charAt(0).toUpperCase() + queueName.slice(1);
  @ObjectType(capitalizedQueueName + 'Queue') // Type name is uppercase of query name
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

    @Mutation(() => LoadResults)
    @Authorized('ADMIN')
    async [`load${capitalizedQueueName}Queue`](
      @Args(() => loadInput) args: QueueLoadArgs[N],
    ): Promise<{ size: number }> {
      return { size: (await queueRequest(requestSocket, { queueName, action: 'load', args }, 10 * 60 * 1000)) ?? 0 };
    }
  }
  return QueueResolver;
};

@Resolver()
class ParseQueueResolver extends createQueueResolver('parse') {}

@Resolver()
class DedupQueueResolver extends createQueueResolver('dedup') {}

@Resolver()
class OpenevQueueResolver extends createQueueResolver('openev') {}

@Resolver()
class CaselistQueueResolver extends createQueueResolver('caselist') {}

@Resolver()
class SchoolQueueResolver extends createQueueResolver('school') {}

@Resolver()
class TeamQueueResolver extends createQueueResolver('team') {}

export const QueueResolvers = [
  ParseQueueResolver,
  DedupQueueResolver,
  OpenevQueueResolver,
  CaselistQueueResolver,
  SchoolQueueResolver,
  TeamQueueResolver,
];
