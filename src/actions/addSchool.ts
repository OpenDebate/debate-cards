import { Caselist, School, Team } from 'app/constants/caselist/api';
import { db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { SchoolLoadedEvent } from './addCaselist';

export type TeamLoadedEvent = { caselist: Caselist; school: School; team: Team };

export type AddSchoolResult = { id: number; teams: Team[] };

export default async ({ caselist, school }: SchoolLoadedEvent): Promise<AddSchoolResult> => {
  const saved = await db.school.upsert(caselistToPrisma(school, 'schoolId', 'caselistId'));
  const { body: teams } = await caselistApi.getTeams(caselist.name, school.name);
  return { id: saved.id, teams };
};
