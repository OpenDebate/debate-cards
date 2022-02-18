import { EvidenceSet, Round } from '@prisma/client';
import addRound from 'app/actions/addRound';
import addFile from 'app/actions/addFile';
import { db, RequestError, timeElapsed, wikiDowload, wikiRequest } from 'app/lib';
import { countBy, sumBy } from 'lodash';
import path from 'path';
import { Queue } from 'typescript-collections';

interface WikiStatus {
  label: string;
  downloaded: number;
  processed: number;
  loaded: number | string;
  skipped: number;
  errors: number;
}

class Wiki {
  static nameRegex = /^(?<type>[a-z]+)(?<year>\d+)?$/;
  static WIKITYPES = {
    hspolicy: 'High School Policy',
    hsld: 'High School LD',
    hspf: 'High School PF',
    opencaselist: 'College Policy',
    openev: 'Open Evidence',
    nfald: 'College LD',
  };
  name: string;
  label: string;
  year: number;
  isOpenEv: boolean;
  evidenceSet: EvidenceSet;

  downloadQueue = new Queue<any>();
  loaded = [];
  processed = [];
  files: string[] = [];
  errors = [];

  constructor(name: string) {
    let { type, year } = Wiki.nameRegex.exec(name)?.groups || {};
    if (!type) throw new Error('Error parsing wiki name ' + name);
    type = Wiki.WIKITYPES[type];

    this.name = name;
    this.isOpenEv = name.startsWith('openev');
    this.year = +year;
    if (!this.isOpenEv) this.year += 2000; // non openev just has last 2 digits
    this.label = `${type} ${this.year}`;
  }

  async createEvidenceSet() {
    this.evidenceSet = await db.evidenceSet.upsert({
      where: { name: this.name },
      create: { name: this.name, label: this.label },
      update: {},
    });
  }

  async loadData() {
    const base = `https://openev.debatecoaches.org/rest/wikis/`;

    this.loaded = this.isOpenEv
      ? (await wikiRequest(`${base}/openev/spaces/${this.year}/attachments?number=-1`))?.attachments
      : (await wikiRequest(`${base}/${this.name}/classes/Caselist.RoundClass/objects`))?.objectSummaries;

    if (!this.loaded) throw new Error('Failed to load round data for ' + this.name);

    if (this.isOpenEv) this.loaded.forEach((attachment) => this.downloadQueue.add(attachment));
  }

  async processData() {
    if (this.isOpenEv) return;
    for (const round of this.loaded) {
      const pageUrl = round.links[0].href.split('/').slice(0, -3).join('/');
      const data = await addRound(pageUrl, round.number, round.guid);

      if (data.hasOwnProperty('err')) {
        let error = (data as { err: string }).err;
        const skipped = ['Not Found', 'Template'].includes(error);
        if (!skipped) console.error(data, round.links[0]);
        this.errors.push({ ...round, error, skipped });
      } else {
        this.processed.push(data);
        if ((data as Round).status === 'PENDING') this.downloadQueue.add(data as Round);
      }
    }
  }

  async download() {
    const download = this.downloadQueue.dequeue();
    if (!download) return setTimeout(() => this.download(), 10000);
    if (!this.isOpenEv && !download.openSourceUrl) return setImmediate(() => this.download());

    let fPath: string;
    if (this.isOpenEv) {
      fPath = path.join(process.env.DOCUMENT_PATH, this.name, download.name);
    } else {
      const { wiki, school, team, side, tournament, roundNum } = download;
      fPath = path.join(process.env.DOCUMENT_PATH, wiki, school, team, side, `${tournament}-Round${roundNum}.docx`);
    }

    const url = this.isOpenEv ? download.links[1].href : download.openSourceUrl;
    const file = await wikiDowload(url, fPath);

    if (file.hasOwnProperty('err')) {
      let error = (file as { err: RequestError }).err;
      const skipped = error.message === 'Not docx' || error.status === 404;

      const updated = this.isOpenEv
        ? download
        : await db.round.update({
            where: { gid: download.gid },
            data: { status: skipped ? 'PROCESSED' : 'ERROR' },
          });

      if (!skipped) {
        console.error(`Failed to load file ${fPath} from ${url}`, error);
        this.errors.push({ ...updated, error, skipped });
      }
    } else {
      const fileId = await addFile({
        name: path.basename(fPath),
        path: fPath,
        evidenceSet: { connect: { name: this.evidenceSet.name } },
      });

      if (!this.isOpenEv)
        await db.round.update({
          where: { gid: download.gid },
          data: { openSource: { connect: { gid: fileId } }, status: 'PROCESSED' },
        });

      this.files.push(fileId);
      if (this.isOpenEv) this.processed.push(fileId);
    }
    setImmediate(() => this.download());
  }

  getStatus(): WikiStatus {
    const errors = countBy(this.errors, 'skipped');
    return {
      label: this.label,
      downloaded: this.files.length,
      processed: this.processed.length,
      loaded: this.loaded.length || 'Loading...',
      skipped: errors.true || 0,
      errors: errors.false || 0,
    };
  }
}

async function loadWikis() {
  const wikiData = await wikiRequest(`https://openev.debatecoaches.org/rest/wikis/`);
  if (!wikiData?.wikis) throw new Error('Failed to load wikis');

  const wikis: Wiki[] = wikiData.wikis
    .filter((data) => data.name !== 'openev') // handle seperatley
    .map((data) => new Wiki(data.name));

  const openEvYears = (await wikiRequest('https://openev.debatecoaches.org/rest/wikis/openev/spaces')).spaces
    .map((space) => space.name)
    .filter((name: string) => name.startsWith('20'));
  for (const year of openEvYears) wikis.push(new Wiki('openev' + year));

  await Promise.all(wikis.map((wiki) => wiki.createEvidenceSet()));
  return wikis;
}

async function main() {
  console.log('Loading wikis');
  const wikis = await loadWikis();
  console.log(`${wikis.length} wikis loaded`);

  console.log('Loading round data');
  const startTime = Date.now();
  const logger = setInterval(() => {
    console.clear();
    console.log('Time elapsed ' + timeElapsed(startTime));
    const statuses = wikis.map((wiki) => wiki.getStatus());
    const totals = {
      downloaded: sumBy(statuses, 'downloaded'),
      processed: sumBy(statuses, 'processed'),
      loaded: sumBy(statuses, ({ loaded }) => (typeof loaded === 'string' ? 0 : loaded)),
      skipped: sumBy(statuses, 'skipped'),
      errors: sumBy(statuses, 'errors'),
    };
    const data = statuses.reduce(
      (prev, cur) => {
        prev[cur.label] = cur;
        delete cur.label;
        return prev;
      },
      { Total: totals },
    );

    console.table(data);
  }, 1000);

  await Promise.all(wikis.map((wiki) => wiki.loadData()));
  wikis.forEach((wiki) => wiki.download());
  await Promise.all(wikis.map((wiki) => wiki.processData()));

  clearInterval(logger);
  console.log('Done!');
}

export default {
  main,
  name: 'wiki',
};
