import { wikiRequest } from 'app/lib/request';
import { WIKITYPES, WIKI_NAME_REGEX, CITE, OBJECT_SUMMARIES, ROUND, SPACES, WIKIS, ATTACHMENTS } from 'app/constants';
import type { Prisma, Side } from '@prisma/client';
import { keyBy, lowerFirst, mapValues, pick } from 'lodash';

export interface WikiInfo {
  name: string;
  isOpenEv: boolean;
  year: string;
  label: string;
}

export interface RoundInfo {
  url: string;
  roundId: number;
  gid: string;
}

const getCites = async (pageUrl: string, citeNums: string): Promise<string[]> => {
  const cites = [];
  for (const num of citeNums.split(',')) {
    if (!num) continue;
    const cite = await wikiRequest(`${pageUrl}/objects/Caselist.CitesClass/${num}/properties/Cites`, CITE);
    if (!('err' in cite)) cites.push(cite.value);
  }
  return cites;
};

export const loadRound = async (pageUrl: string, roundId: number): Promise<Omit<Prisma.RoundCreateInput, 'gid'>> => {
  const raw = await wikiRequest(`${pageUrl}/objects/Caselist.RoundClass/${roundId}`, ROUND);
  if ('err' in raw) throw new Error(raw.err.message);

  const properties = mapValues(
    keyBy(raw.properties, ({ name }) => lowerFirst(name)),
    'value',
  );

  const { wiki, space: school } = raw;
  const teamData = raw.pageName.split(' ');
  const side = teamData.pop().toUpperCase();
  const team = teamData.join(' ');
  if (side === 'ROUNDTEMPLATE') throw new Error('Template');
  if (!['AFF', 'NEG'].includes(side)) throw new Error('Invalid side');

  const { round: roundNum, cites: citeNum } = properties;
  const cites = await getCites(pageUrl, citeNum);
  const openSourceUrl = properties.openSource
    ? `${pageUrl}/attachments/${new URL(properties.openSource).pathname.split('/').pop()}`
    : undefined;

  return {
    ...{ wiki, school, team, side: side as Side, cites, roundNum },
    ...pick(properties, 'tournament', 'judge', 'opponent', 'roundReport'),
    entryDate: new Date(properties.entryDate),
    openSourceUrl,
    status: properties.openSource?.endsWith('docx') ? 'PENDING' : 'PROCESSED',
  };
};

const parseWikiName = (name: string): WikiInfo => {
  const { type, year } = WIKI_NAME_REGEX.exec(name)?.groups || {};
  if (!type) throw new Error('Could not parse wiki name ' + name);
  return {
    name,
    isOpenEv: name.startsWith('openev'),
    year: year,
    label: `${WIKITYPES[type]} ${year}`,
  };
};

type WikiLoader = () => Promise<WikiInfo[]>;
export const loadOpenEvs: WikiLoader = async () => {
  const spaceData = await wikiRequest('https://openev.debatecoaches.org/rest/wikis/openev/spaces', SPACES);
  if ('err' in spaceData) throw new Error('Failed to load openev data: ' + spaceData.err.message);

  return spaceData.spaces
    .filter((space) => space.name.startsWith('20'))
    .map(({ name }) => parseWikiName('openev' + name));
};

export const loadWikis: WikiLoader = async () => {
  const wikiData = await wikiRequest(`https://openev.debatecoaches.org/rest/wikis/`, WIKIS);
  if ('err' in wikiData) throw new Error('Failed to load wikis: ' + wikiData.err.message);

  return wikiData.wikis.filter((wiki) => wiki.name !== 'openev').map(({ name }) => parseWikiName(name));
};

const base = 'https://openev.debatecoaches.org/rest/wikis/';
export const loadRounds = async (wiki: WikiInfo): Promise<RoundInfo[]> => {
  const rounds = await wikiRequest(`${base}/${wiki.name}/classes/Caselist.RoundClass/objects`, OBJECT_SUMMARIES);
  if ('err' in rounds) throw new Error(`Could not load data for ${wiki.name}: ${rounds.err.message}`);
  return rounds.objectSummaries.map((round) => ({
    url: round.links[0].href.split('/').slice(0, -3).join('/'),
    roundId: round.number,
    gid: round.guid,
  }));
};

export const loadOpenEv = async (wiki: WikiInfo): Promise<{ name: string; url: string; wiki: WikiInfo }[]> => {
  const attachments = await wikiRequest(`${base}/openev/spaces/${wiki.year}/attachments?number=-1`, ATTACHMENTS);
  if ('err' in attachments) throw new Error(`Could not load data for ${wiki.name}: ${attachments.err.message}`);
  return attachments.attachments.map(({ name, xwikiAbsoluteUrl }) => ({
    name,
    url: xwikiAbsoluteUrl,
    wiki,
  }));
};
