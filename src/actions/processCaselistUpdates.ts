import { CaselistPriority, UPDATE_WAIT_MS } from 'app/constants';
import { Caselist } from 'app/constants/caselist/api';
import { TypedEvent, db } from 'app/lib';
import { createPriorityCaselistApi } from 'app/lib/caselist';
import addCaselist from './addCaselist';
import addSchool from './addSchool';
import addTeam from './addTeam';

export const onUpdateReady = new TypedEvent<Caselist>();
const caselistLastUpdates: Map<string, Map<number, string>> = new Map();
const updateLoader = createPriorityCaselistApi(CaselistPriority.UPDATE_LOAD);
const updateDownloader = createPriorityCaselistApi(CaselistPriority.UPDATE_DOWNLOAD);

export default async (caselist: Caselist): Promise<number> => {
  // Check for updates again
  onUpdateReady.emit(caselist);

  // Wait for some time to prevent spamming the api
  // Done after adding a new event to the queue so clearing the queue works
  await new Promise((resolve) => setTimeout(resolve, UPDATE_WAIT_MS));

  const lastUpdates = caselistLastUpdates.get(caselist.name) ?? new Map<number, string>();

  const { body: updates } = await updateLoader.getRecent(caselist.name);
  // New updates or updates with a new timestamp
  const newUpdates = updates.filter((update) => lastUpdates.get(update.roundId) !== update.updatedAt);
  console.log(caselist.displayName, 'updates', newUpdates, newUpdates.length);
  for (const update of newUpdates) {
    try {
      const caselistEntity = await db.caselist.findUnique({ where: { name: caselist.name } });
      if (!caselistEntity) {
        await addCaselist(caselist);
        continue;
      }
      const schoolEntity = await db.school.findUnique({
        where: { name_caselistId: { name: update.schoolName, caselistId: caselistEntity.caselistId } },
      });
      if (!schoolEntity) {
        await addSchool({
          caselist,
          school: (await updateDownloader.getSchool(caselist.name, update.schoolName)).body,
        });
        continue;
      }
      await addTeam({
        caselist,
        school: schoolEntity,
        team: (await updateDownloader.getTeam(caselist.name, update.schoolName, update.teamName)).body,
      });
    } catch (err) {
      console.error('Error processing update', update);
    }
  }

  caselistLastUpdates.set(caselist.name, new Map(updates.map((update) => [update.roundId, update.updatedAt])));
  return newUpdates.length;
};
