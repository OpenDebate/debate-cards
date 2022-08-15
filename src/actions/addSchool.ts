import { Team } from 'app/constants/caselist/api';
import { db, TypedEvent } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { SchoolLoadedEvent } from './addCaselist';

export type TeamLoadedEvent = { caselistName: string; schoolName: string; team: Team };
export const onTeamLoaded = new TypedEvent<TeamLoadedEvent>();

export default async ({ caselistName, school }: SchoolLoadedEvent): Promise<number> => {
  const saved = await db.school.upsert(caselistToPrisma(school, 'schoolId', 'caselistId'));

  const { body: teams } = await caselistApi.getTeams(caselistName, school.name);
  for (const team of teams) onTeamLoaded.emit({ caselistName, schoolName: saved.name, team });
  return saved.id;
};
