import { Queue } from 'bullmq';
import { connection } from 'app/lib/queues/connection';
import { Arg, Args, Authorized, Field, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import * as QueueInputs from '../inputs/queues';

// Create BullMQ Queue references for reading stats (no workers needed in API process)
const queues: Record<string, Queue> = {
  parse: new Queue('parse', { connection }),
  dedup: new Queue('dedup', { connection }),
  openev: new Queue('openev', { connection }),
  caselist: new Queue('caselist', { connection }),
  school: new Queue('school', { connection }),
  team: new Queue('team', { connection }),
  opensource: new Queue('opensource', { connection }),
  update: new Queue('update', { connection }),
};

type QueueName = keyof typeof queues;

@ObjectType()
class LoadResults {
  @Field()
  size: number;
}

@ObjectType()
class QueueInfo {
  @Field()
  name: string;

  @Field()
  waiting: number;

  @Field()
  active: number;

  @Field()
  completed: number;

  @Field()
  failed: number;

  @Field()
  delayed: number;
}

@Resolver()
export class QueueStatsResolver {
  @Query(() => [QueueInfo])
  @Authorized('ADMIN')
  async queueStats(): Promise<QueueInfo[]> {
    const stats: QueueInfo[] = [];
    for (const [name, queue] of Object.entries(queues)) {
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      stats.push({
        name,
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
      });
    }
    return stats;
  }

  @Query(() => QueueInfo)
  @Authorized('ADMIN')
  async queueInfo(@Arg('name') name: string): Promise<QueueInfo> {
    const queue = queues[name];
    if (!queue) throw new Error(`No queue with name ${name}`);
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return {
      name,
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }

  @Mutation(() => LoadResults)
  @Authorized('ADMIN')
  async loadCaselistQueue(@Args(() => QueueInputs.CaselistLoadInput) args: QueueInputs.CaselistLoadInput) {
    const { loadCaselists } = await import('app/modules/caselist/flow');
    return { size: await loadCaselists(args) };
  }

  @Mutation(() => LoadResults)
  @Authorized('ADMIN')
  async loadOpenevQueue(@Args(() => QueueInputs.OpenevLoadInput) args: QueueInputs.OpenevLoadInput) {
    const { loadOpenev } = await import('app/modules/caselist/flow');
    return { size: await loadOpenev(args.years) };
  }

  @Mutation(() => LoadResults)
  @Authorized('ADMIN')
  async loadUpdateQueue(@Args(() => QueueInputs.UpdateLoadInput) args: QueueInputs.UpdateLoadInput) {
    const { loadUpdates } = await import('app/modules/caselist/flow');
    return { size: await loadUpdates(args.caselists) };
  }

  @Mutation(() => LoadResults)
  @Authorized('ADMIN')
  async loadParseQueue(@Args(() => QueueInputs.ParseLoadInput) args: QueueInputs.ParseLoadInput) {
    const { loadParseJobs } = await import('app/modules/parser/flow');
    return { size: await loadParseJobs(args) };
  }

  @Mutation(() => LoadResults)
  @Authorized('ADMIN')
  async loadDedupQueue(@Args(() => QueueInputs.DedupLoadInput) args: QueueInputs.DedupLoadInput) {
    const { loadDedupJobs } = await import('app/modules/deduplicator/flow');
    return { size: await loadDedupJobs(args) };
  }

  @Mutation(() => Number)
  @Authorized('ADMIN')
  async clearQueue(@Arg('name') name: string): Promise<number> {
    const queue = queues[name];
    if (!queue) throw new Error(`No queue with name ${name}`);
    const before = await queue.getJobCounts('waiting', 'delayed');
    await queue.obliterate({ force: true });
    return before.waiting + before.delayed;
  }
}

export const QueueResolvers = [QueueStatsResolver];
