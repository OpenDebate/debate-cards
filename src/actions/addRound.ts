import { db, wikiRequest } from 'app/lib';
import { FileStatus, Round } from '@prisma/client';
import { keyBy, mapValues, pick } from 'lodash';

const getCites = (pageUrl: string, citeNums: string): Promise<any> =>
  new Promise(async (resolve) => {
    const cites = [];
    for (const num of citeNums.split(',')) {
      if (!num) continue;
      const cite = await wikiRequest(`${pageUrl}/Caselist.CitesClass/${num}/properties/Cites`);
      if (cite) cites.push(cite.value);
    }
    resolve(cites);
  });

export default async (pageUrl: string, roundNum: number, gid: string): Promise<Round | string> => {
  const existing = await db.round.findUnique({ where: { gid } });
  if (existing) return existing;

  const rawProperties = await wikiRequest(`${pageUrl}/Caselist.RoundClass/${roundNum}`);
  if (!rawProperties) return 'Not Found';

  const properties = mapValues(
    keyBy(rawProperties.properties, ({ name }) => name[0].toLowerCase() + name.slice(1)),
    'value',
  );

  const { wiki, space: school } = rawProperties;
  const teamData = rawProperties.pageName.split(' ');
  const team = teamData.slice(0, -1).join(' '); // can have space in rare cases
  const side = teamData.slice(-1)[0].toUpperCase();
  if (side === 'ROUNDTEMPLATE') return 'Template';

  const { round, cites: citeNum } = properties;
  const cites = await getCites(pageUrl, citeNum);

  const data = {
    ...{ gid, wiki, school, team, side, cites },
    roundNum: round,
    entryDate: new Date(properties.entryDate),
    ...pick(properties, 'tournament', 'judge', 'opponent', 'roundReport'),
    openSourceUrl: properties.openSource || undefined,
    status: (properties.openSource ? 'PENDING' : 'PROCESSED') as FileStatus,
  };

  return await db.round.upsert({
    where: { gid },
    create: data,
    update: data,
  });
};
