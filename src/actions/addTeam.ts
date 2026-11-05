import { db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { TeamLoadedEvent } from './addSchool';
import { OpensourceLoadedEvent } from './addOpensource';
import addRound from './addRound';

export type AddTeamResult = {
  id: number;
  opensourceEvents: OpensourceLoadedEvent[];
};

export default async ({ caselist, school, team }: TeamLoadedEvent): Promise<AddTeamResult> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselist.name, school.name, saved.name);
  const opensourceEvents: OpensourceLoadedEvent[] = [];
  let updated = false;

  for (const round of rounds) {
    const existingRound = await db.round.findUnique({ where: { roundId: round.roundId } });
    if (existingRound?.caselistUpdatedAt === round.updatedAt) continue;
    updated = true;
    const result = await addRound({ caselist, school, team, round });
    if (result.opensource) opensourceEvents.push(result.opensource);
  }

  if (updated) {
    // Rounds are already saved as up to date, so throwing here would make the retry skip them
    // and drop their opensource files. Cites are secondary; log and carry on.
    try {
      const { body: cites } = await caselistApi.getCites(caselist.name, school.name, saved.name);
      await Promise.all(cites.map((cite) => cite.cites && db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));
    } catch (err) {
      console.warn(`Failed to load cites for ${caselist.name}/${school.name}/${saved.name}: ${err?.message ?? err}`);
    }
  }

  return { id: saved.id, opensourceEvents };
};
