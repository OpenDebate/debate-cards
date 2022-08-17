import { connectOrCreateTag, db } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import addFile from './addFile';
import downloadFile from './downloadFile';
import { TeamLoadedEvent } from './addSchool';
import { omit } from 'lodash';
import path from 'path';
import { EVENT_NAMES } from 'app/constants/caselistNames';

export default async ({ caselist, school, team }: TeamLoadedEvent): Promise<number> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselist.name, school.name, saved.name);
  await Promise.all(
    rounds.map(async (round) => {
      const saveData = { ...omit(round, 'opensource'), opensourcePath: round.opensource };
      const saved = await db.round.upsert(caselistToPrisma(saveData, 'roundId', 'teamId'));
      if (round.opensource) {
        const tags = [
          connectOrCreateTag('wiki', 'Wiki'),
          connectOrCreateTag(caselist.name, caselist.displayName),
          connectOrCreateTag(caselist.year.toString(), caselist.year.toString()),
          connectOrCreateTag(caselist.level, caselist.level === 'college' ? 'College' : 'High School'),
          connectOrCreateTag(caselist.event, EVENT_NAMES[caselist.event]),
          connectOrCreateTag(school.name, school.displayName),
          connectOrCreateTag(
            `${caselist.name}/${school.name}/${team.name}`,
            `${caselist.displayName}/${school.displayName}/${team.displayName}`,
          ),
          connectOrCreateTag(`wiki${round.side}`, `Wiki ${round.side === 'A' ? 'Affirmative' : 'Negative'}`),
        ];
        await downloadFile(round.opensource);
        await addFile({
          path: `./documents/${round.opensource}`,
          name: path.parse(round.opensource).name,
          round: { connect: { id: saved.id } },
          tags: { connectOrCreate: tags },
        });
      }
    }),
  );

  const { body: cites } = await caselistApi.getCites(caselist.name, school.name, saved.name);
  await Promise.all(cites.map((cite) => db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));

  return saved.id;
};
