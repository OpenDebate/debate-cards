import { Worker, Job } from 'bullmq';
import { createConnection } from 'app/lib/queues/connection';
import { db } from 'app/lib';
import { caselistApi } from 'app/lib/caselist';
import addCaselist from 'app/actions/addCaselist';
import addSchool from 'app/actions/addSchool';
import addTeam from 'app/actions/addTeam';
import addOpensource from 'app/actions/addOpensource';
import addOpenev from 'app/actions/addOpenev';
import processCaselistUpdates from 'app/actions/processCaselistUpdates';
import { schoolQueue, teamQueue, opensourceQueue } from './queue';
import { parseQueue } from 'app/modules/parser/queue';
import { attachFailureLogger } from 'app/lib/failureLogger';

export const caselistWorker = new Worker(
  'caselist',
  async (job: Job) => {
    const { schoolNameAlphaLimit } = job.data;
    let { caselist, schools } = await addCaselist(job.data);

    // Temporary: filter schools by alphabetical limit for testing
    if (schoolNameAlphaLimit) {
      schools = schools.filter((school) => school.name[0].toUpperCase() <= schoolNameAlphaLimit.toUpperCase());
      console.log(`[TEST] Limited schools to A-${schoolNameAlphaLimit}: ${schools.length} schools`);
    }

    await schoolQueue.addBulk(
      schools.map((school) => ({
        name: `school:${school.name}`,
        data: { caselist, school },
      })),
    );
    return { caselistName: caselist.name, schoolCount: schools.length };
  },
  { connection: createConnection(), concurrency: 2, lockDuration: 5 * 60 * 1000 },
);

export const schoolWorker = new Worker(
  'school',
  async (job: Job) => {
    const { caselist, school } = job.data;
    const { teams } = await addSchool({ caselist, school });

    // Filter teams to only include those with pending/updated rounds
    const teamsWithUpdates = [];
    for (const team of teams) {
      const { body: rounds } = await caselistApi.getRounds(caselist.name, school.name, team.name);

      let needsProcessing = false;
      if (rounds.length > 0) {
        for (const round of rounds) {
          const existingRound = await db.round.findUnique({ where: { roundId: round.roundId } });
          if (!existingRound || existingRound.caselistUpdatedAt !== round.updatedAt) {
            needsProcessing = true;
            break;
          }
        }
      }

      if (needsProcessing) {
        teamsWithUpdates.push(team);
      }
    }

    // Only add teams that have new/updated rounds
    if (teamsWithUpdates.length > 0) {
      await teamQueue.addBulk(
        teamsWithUpdates.map((team) => ({
          name: `team:${team.name}`,
          data: { caselist, school, team },
        })),
      );
    }

    return { teamCount: teamsWithUpdates.length, skipped: teams.length - teamsWithUpdates.length };
  },
  { connection: createConnection(), concurrency: 2, lockDuration: 5 * 60 * 1000 },
);

export const teamWorker = new Worker(
  'team',
  async (job: Job) => {
    const { caselist, school, team } = job.data;
    const { id, opensourceEvents } = await addTeam({ caselist, school, team });
    if (opensourceEvents.length > 0) {
      await opensourceQueue.addBulk(
        opensourceEvents.map((event) => ({
          name: `opensource:${event.filePath}`,
          data: event,
        })),
      );
    }
    return { teamId: id, opensourceCount: opensourceEvents.length };
  },
  { connection: createConnection(), concurrency: 2, lockDuration: 5 * 60 * 1000 },
);

export const opensourceWorker = new Worker(
  'opensource',
  async (job: Job) => {
    const result = await addOpensource(job.data);
    if (result?.gid) {
      await parseQueue.add(`parse:${result.gid}`, { gid: result.gid }, { jobId: `parse:${result.gid}` });
    }
  },
  { connection: createConnection(), concurrency: 5, lockDuration: 5 * 60 * 1000 },
);

export const openevWorker = new Worker(
  'openev',
  async (job: Job) => {
    const result = await addOpenev(job.data);
    if (result?.gid) {
      await parseQueue.add(`parse:${result.gid}`, { gid: result.gid }, { jobId: `parse:${result.gid}` });
    }
  },
  { connection: createConnection(), concurrency: 2, lockDuration: 5 * 60 * 1000 },
);

export const updateWorker = new Worker(
  'update',
  async (job: Job) => {
    const count = await processCaselistUpdates(job.data);
    return { updatedCount: count };
  },
  { connection: createConnection(), concurrency: 1, lockDuration: 5 * 60 * 1000 },
);

[caselistWorker, schoolWorker, teamWorker, opensourceWorker, openevWorker, updateWorker].forEach(attachFailureLogger);
