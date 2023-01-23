import { Caselist, School, Team } from 'app/constants/caselist/api';
import { db, TypedEvent } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { SchoolLoadedEvent } from './addCaselist';

export type TeamLoadedEvent = { caselist: Caselist; school: School; team: Team };
export const onTeamLoaded = new TypedEvent<TeamLoadedEvent>();

export default async ({ caselist, school }: SchoolLoadedEvent): Promise<number> => {
  const saved = await db.school.upsert(caselistToPrisma(school, 'schoolId', 'caselistId'));

  const { body: teams } = await caselistApi.getTeams(caselist.name, school.name);
  for (const team of teams) onTeamLoaded.emit({ caselist: caselist, school, team });
  return saved.id;
};
