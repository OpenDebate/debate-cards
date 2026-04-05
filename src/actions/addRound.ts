import { db } from 'app/lib/db';
import { Round } from 'app/constants/caselist/api';
import { OpenSourceTagInput, caselistToPrisma, openSourceTags } from 'app/lib/caselist';
import { OpensourceLoadedEvent } from './addOpensource';
import { omit } from 'lodash';

export type AddRoundResult = {
  id: number;
  opensource?: OpensourceLoadedEvent;
};

export default async ({ caselist, school, team, round }: OpenSourceTagInput & { round: Round }): Promise<AddRoundResult> => {
  const saveData = {
    ...omit(round, 'opensource', 'createdAt', 'updatedAt'),
    opensourcePath: round.opensource,
    caselistUpdatedAt: round.updatedAt,
  };
  const saved = await db.round.upsert(caselistToPrisma(saveData, 'roundId', 'teamId'));
  const result: AddRoundResult = { id: saved.id };
  if (round.opensource) {
    result.opensource = {
      id: saved.id,
      filePath: round.opensource,
      tags: openSourceTags({ caselist, school, team, round }),
    };
  }
  return result;
};
