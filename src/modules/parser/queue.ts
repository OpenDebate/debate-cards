import { connection } from 'app/lib/queues/connection';
import { Queue } from 'bullmq';

export const parseQueue = new Queue('parse', { connection });
