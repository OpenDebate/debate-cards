import { db, wikiRequest } from 'app/lib';
import { FileStatus, Round } from '@prisma/client';
import { keyBy, mapValues, pick } from 'lodash';

const getCites = (pageUrl: string, citeNums: string): Promise<any> =>
  new Promise(async (resolve) => {
    const cites = [];
    for (const num of citeNums.split(',')) {
      if (!num) continue;
      const cite = await wikiRequest(`${pageUrl}/objects/Caselist.CitesClass/${num}/properties/Cites`);
      if (!cite.err) cites.push(cite.value);
    }
    resolve(cites);
  });

export default async (pageUrl: string, roundNum: number, gid: string): Promise<Round | { err: string }> => {
  const existing = await db.round.findUnique({ where: { gid } });
  if (existing) return existing;

  const rawProperties = await wikiRequest(`${pageUrl}/objects/Caselist.RoundClass/${roundNum}`);
  if (rawProperties.err) return { err: 'Not Found' };

  const properties = mapValues(
    keyBy(rawProperties.properties, ({ name }) => name[0].toLowerCase() + name.slice(1)),
    'value',
  );

  const { wiki, space: school } = rawProperties;
  const teamData = rawProperties.pageName.split(' ');
  const team = teamData.slice(0, -1).join(' '); // can have space in rare cases
  const side = teamData.slice(-1)[0].toUpperCase();
  if (side === 'ROUNDTEMPLATE') return { err: 'Template' };
  if (!(side === 'AFF' || side === 'NEG')) return { err: 'Invalid Side' };

  const { round, cites: citeNum } = properties;
  const cites = await getCites(pageUrl, citeNum);
  const openSourceUrl = properties.openSource
    ? `${pageUrl}/attachments/${new URL(properties.openSource).pathname.split('/').pop()}`
    : undefined;

  const data = {
    ...{ gid, wiki, school, team, side, cites },
    roundNum: round,
    entryDate: new Date(properties.entryDate),
    ...pick(properties, 'tournament', 'judge', 'opponent', 'roundReport'),
    openSourceUrl,
    status: (properties.openSource ? 'PENDING' : 'PROCESSED') as FileStatus,
  };

  return await db.round.upsert({
    where: { gid },
    create: data,
    update: data,
  });
};
