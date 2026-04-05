import { caselistQueue, openevQueue, updateQueue } from './queue';
import { priorityCaselistApi } from 'app/lib/caselist';
import { Caselist, ModelFile } from 'app/constants/caselist/api';

export type CaselistLoadOptions = {
  archived?: boolean;
  active?: boolean;
  years?: number[];
  names?: string[];
  /** Temporary: limit schools by alphabetical character. E.g., 'M' processes only schools A-M */
  schoolNameAlphaLimit?: string;
  /** When true, assume all API responses are cached. Missing files on disk are skipped without API calls. */
  expectCached?: boolean;
};

export async function loadCaselists(options: CaselistLoadOptions): Promise<number> {
  let caselists: Caselist[] = [];
  if (options.archived || options.years || options.names)
    caselists = caselists.concat((await priorityCaselistApi.getCaselists(true)).body);
  if (options.active || options.years || options.names)
    caselists = caselists.concat((await priorityCaselistApi.getCaselists(false)).body);
  if (options.years || options.names)
    caselists = caselists.filter((c) => options.years?.includes(c.year) || options.names?.includes(c.name));

  caselists.sort((a, b) => b.year - a.year);
  console.log(JSON.stringify(caselists, null, 2));

  await caselistQueue.addBulk(
    caselists.map((caselist) => ({
      name: `caselist:${caselist.name}`,
      data: { name: caselist.name, schoolNameAlphaLimit: options.schoolNameAlphaLimit, expectCached: options.expectCached },
    })),
  );

  return caselists.length;
}

export async function loadOpenev(years?: number[]): Promise<number> {
  const files: ModelFile[] = [];
  const defaultYears = [];
  for (let year = 2024; year >= 2013; year--) defaultYears.push(year);

  for (const year of years ?? defaultYears) {
    files.push(...(await priorityCaselistApi.getFiles(year)).body);
  }

  await openevQueue.addBulk(
    files.map((file) => ({
      name: `openev:${file.name}`,
      data: file,
    })),
  );

  return files.length;
}

export async function loadUpdates(caselistNames?: string[]): Promise<number> {
  const caselists = caselistNames
    ? await Promise.all(caselistNames.map(async (name) => (await priorityCaselistApi.getCaselist(name)).body))
    : (await priorityCaselistApi.getCaselists(false)).body;

  await updateQueue.addBulk(
    caselists.map((caselist) => ({
      name: `update:${caselist.name}`,
      data: caselist,
    })),
  );

  return caselists.length;
}
