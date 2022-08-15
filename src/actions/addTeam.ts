import { db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { omit } from 'lodash';
import { TeamLoadedEvent } from './addSchool';

export default async ({ caselistName, schoolName, team }: TeamLoadedEvent): Promise<number> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselistName, schoolName, saved.name);
  await Promise.all(
    rounds.map((round) =>
      db.round.upsert(
        // Fix for opensource field name is temporary
        caselistToPrisma({ ...omit(round, 'opensource'), opensourcePath: round.opensource }, 'roundId', 'teamId'),
      ),
    ),
  );

  const { body: cites } = await caselistApi.getCites(caselistName, schoolName, saved.name);
  await Promise.all(cites.map((cite) => db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));

  return saved.id;
};
