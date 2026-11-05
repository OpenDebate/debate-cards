import { connection } from 'app/lib/queues/connection';
import { defaultJobOptions } from 'app/lib/queues/options';
import { Queue } from 'bullmq';

export const parseQueue = new Queue('parse', { connection, defaultJobOptions });
