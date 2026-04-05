import { Caselist, School } from 'app/constants/caselist/api';
import { db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';

export type SchoolLoadedEvent = { caselist: Caselist; school: School };

export default async (data: Pick<Caselist, 'name'>): Promise<{ caselist: Caselist; schools: School[] }> => {
  const { body: caselist } = await caselistApi.getCaselist(data.name);
  const { body: schools } = await caselistApi.getSchools(data.name);

  await db.caselist.upsert(caselistToPrisma(caselist, 'caselistId'));

  return { caselist, schools };
};
