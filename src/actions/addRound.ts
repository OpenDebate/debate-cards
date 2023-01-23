import { db } from 'app/lib/db';
import { Round } from 'app/constants/caselist/api';
import { OpenSourceTagInput, caselistToPrisma, openSourceTags } from 'app/lib/caselist';
import { onOpensourceLoaded } from './addTeam';
import { omit } from 'lodash';

export default async ({ caselist, school, team, round }: OpenSourceTagInput & { round: Round }): Promise<number> => {
  const saveData = {
    ...omit(round, 'opensource', 'createdAt', 'updatedAt'),
    opensourcePath: round.opensource,
    caselistUpdatedAt: round.updatedAt,
  };
  const saved = await db.round.upsert(caselistToPrisma(saveData, 'roundId', 'teamId'));
  if (round.opensource) {
    onOpensourceLoaded.emit({
      id: saved.id,
      filePath: round.opensource,
      tags: openSourceTags({ caselist, school, team, round }),
    });
  }
  return saved.id;
};
