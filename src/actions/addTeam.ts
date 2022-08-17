import { db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import addFile from './addFile';
import downloadFile from './downloadFile';
import { TeamLoadedEvent } from './addSchool';
import { omit } from 'lodash';
import path from 'path';

export default async ({ caselistName, schoolName, team }: TeamLoadedEvent): Promise<number> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselistName, schoolName, saved.name);
  await Promise.all(
    rounds.map(async (round) => {
      const saveData = { ...omit(round, 'opensource'), opensourcePath: round.opensource };
      const saved = await db.round.upsert(caselistToPrisma(saveData, 'roundId', 'teamId'));
      if (round.opensource) {
        await downloadFile(round.opensource);
        await addFile({
          path: `./documents/${round.opensource}`,
          name: path.parse(round.opensource).name,
          round: { connect: { id: saved.id } },
        });
      }
    }),
  );

  const { body: cites } = await caselistApi.getCites(caselistName, schoolName, saved.name);
  await Promise.all(cites.map((cite) => db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));

  return saved.id;
};
