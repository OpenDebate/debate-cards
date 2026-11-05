import { connection } from 'app/lib/queues/connection';
import { defaultJobOptions } from 'app/lib/queues/options';
import { Queue } from 'bullmq';

export const caselistQueue = new Queue('caselist', { connection, defaultJobOptions });
export const schoolQueue = new Queue('school', { connection, defaultJobOptions });
export const teamQueue = new Queue('team', { connection, defaultJobOptions });
export const opensourceQueue = new Queue('opensource', {
  connection,
  defaultJobOptions: { ...defaultJobOptions, backoff: { type: 'exponential', delay: 250 } },
});
export const openevQueue = new Queue('openev', { connection, defaultJobOptions });
export const updateQueue = new Queue('update', { connection, defaultJobOptions });
