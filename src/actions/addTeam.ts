import { db, TagInput, TypedEvent } from 'app/lib';
import { caselistApi, caselistToPrisma } from 'app/lib/caselist';
import { TeamLoadedEvent } from './addSchool';
import { omit } from 'lodash';
import { EVENT_NAMES } from 'app/constants/caselistNames';
import addOpensource from './addOpensource';

interface OpenSourceTagInput {
  caselist: {
    event: string;
    name: string;
    displayName: string;
    year: number;
    level: string;
  };
  school: {
    name: string;
    displayName: string;
  };
  team: {
    name: string;
    displayName: string;
  };
  round: {
    side: string;
  };
}
export const openSourceTags = ({ caselist, school, team, round }: OpenSourceTagInput): TagInput[] => [
  { name: 'wiki', label: 'Wiki' },
  { name: caselist.name, label: caselist.displayName },
  { name: caselist.year.toString(), label: caselist.year.toString() },
  { name: caselist.level, label: caselist.level === 'college' ? 'College' : 'High School' },
  { name: caselist.event, label: EVENT_NAMES[caselist.event] as string },
  { name: school.name, label: school.displayName },
  {
    name: `${caselist.name}/${school.name}/${team.name}`,
    label: `${caselist.displayName}/${school.displayName}/${team.displayName}`,
  },
  { name: `wiki${round.side}`, label: `Wiki ${round.side === 'A' ? 'Affirmative' : 'Negative'}` },
];

export default async ({ caselist, school, team }: TeamLoadedEvent): Promise<number> => {
  const saved = await db.team.upsert(caselistToPrisma(team, 'teamId', 'schoolId'));

  const { body: rounds } = await caselistApi.getRounds(caselist.name, school.name, saved.name);
  await Promise.all(
    rounds.map(async (round) => {
      const saveData = { ...omit(round, 'opensource'), opensourcePath: round.opensource };
      const saved = await db.round.upsert(caselistToPrisma(saveData, 'roundId', 'teamId'));
      if (round.opensource) {
        // Dont wait for file download
        addOpensource({
          id: saved.id,
          filePath: round.opensource,
          tags: openSourceTags({ caselist, school, team, round }),
        });
      }
    }),
  );

  const { body: cites } = await caselistApi.getCites(caselist.name, school.name, saved.name);
  await Promise.all(cites.map((cite) => cite.cites && db.cite.upsert(caselistToPrisma(cite, 'citeId', 'roundId'))));

  return saved.id;
};
