import { ParseTask } from './parserQueue';
import { DedupTask } from './deduplicationQueue';
import * as Caselist from './caselistQueue';
import * as QueueInputs from '../../inputs/queues';
import type { ExtractQueueName, IPCActions, QueueDataType, QueueType } from 'app/lib';
import { ClassType } from 'type-graphql';

type QueueModels = {
  [Q in QueueType as ExtractQueueName<Q>]: {
    taskType: ClassType<QueueDataType<Q>>;
    loadInput: ClassType<IPCActions<ExtractQueueName<Q>>['load']['args']>;
  };
};
export const QueueModels: QueueModels = {
  parse: { taskType: ParseTask, loadInput: QueueInputs.ParseLoadInput },
  dedup: { taskType: DedupTask, loadInput: QueueInputs.DedupLoadInput },
  openev: { taskType: Caselist.OpenevTask, loadInput: QueueInputs.OpenevLoadInput },
  caselist: { taskType: Caselist.CaselistTask, loadInput: QueueInputs.CaselistLoadInput },
  school: { taskType: Caselist.SchoolTask, loadInput: QueueInputs.SchoolLoadInput },
  team: { taskType: Caselist.TeamTask, loadInput: QueueInputs.TeamLoadInput },
};
