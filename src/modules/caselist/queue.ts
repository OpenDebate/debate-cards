import { connection } from 'app/lib/queues/connection';
import { Queue } from 'bullmq';

export const caselistQueue = new Queue('caselist', { connection });
export const schoolQueue = new Queue('school', { connection });
export const teamQueue = new Queue('team', { connection });
export const opensourceQueue = new Queue('opensource', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 250 },
  },
});
export const openevQueue = new Queue('openev', { connection });
export const updateQueue = new Queue('update', { connection });
