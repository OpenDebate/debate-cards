import { Caselist, School } from 'app/constants/caselist/api';
import { db, TypedEvent } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';

export type SchoolLoadedEvent = { caselistName: string; school: School };
export const onSchoolLoaded = new TypedEvent<SchoolLoadedEvent>();

export default async (data: Caselist): Promise<number> => {
  const saved = await db.caselist.upsert(caselistToPrisma(data, 'caselistId'));

  const { body: schools } = await caselistApi.getSchools(saved.name);
  for (const school of schools) onSchoolLoaded.emit({ caselistName: saved.name, school });
  return saved.id;
};
