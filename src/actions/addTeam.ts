import { db, TypedEvent } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { TeamLoadedEvent } from './addSchool';
import { OpensourceLoadedEvent } from './addOpensource';
import addRound from './addRound';

export const onOpensourceLoaded = new TypedEvent<OpensourceLoadedEvent>();

export default async ({ caselist, school, team }: TeamLoadedEvent): Promise<number> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselist.name, school.name, saved.name);
  let updated = false;
  await Promise.all(
    rounds.map(async (round) => {
      const existingRound = await db.round.findUnique({ where: { roundId: round.roundId } });
      if (existingRound?.caselistUpdatedAt === round.updatedAt) return;
      updated = true;
      return addRound({ caselist, school, team, round });
    }),
  );

  if (updated) {
    const { body: cites } = await caselistApi.getCites(caselist.name, school.name, saved.name);
    await Promise.all(cites.map((cite) => cite.cites && db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));
  }

  return saved.id;
};
