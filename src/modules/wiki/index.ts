import { EvidenceSet, Round } from '@prisma/client';
import addRound from 'app/actions/addRound';
import addFile from 'app/actions/addFile';
import { db, RequestError, timeElapsed, wikiDowload, wikiRequest } from 'app/lib';
import { countBy, sumBy } from 'lodash';
import path from 'path';
import { Queue } from 'typescript-collections';

interface Wiki {
  name: string;
  label: string;
  isOpenEv: boolean;
  evidenceSet: EvidenceSet;
  roundData: any[];
  processed: any[];
  files: string[];
  errors: any[];

  createEvidenceSet: () => Promise<void>;
  loadRounds: () => Promise<void>;
  addRounds: () => Promise<void>;
  download: () => Promise<void>;
  getStatus: () => Partial<WikiStatus>;
}
interface WikiStatus {
  label: string;
  downloaded: number;
  processed: number;
  loaded: number | string;
  skipped: number;
  errors: number;
}
class DebateWiki implements Wiki {
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
  isOpenEv: boolean;
  evidenceSet: EvidenceSet;

  downloadQueue: Queue<Round>;
  roundData: any[];
  processed: any[];
  files: any[];
  errors: any[];

  constructor(wikiData) {
    let { type, year } = DebateWiki.nameRegex.exec(wikiData.name)?.groups || {};
    if (!type) throw new Error('Error parsing wiki name ' + wikiData.name);
    type = DebateWiki.WIKITYPES[type];

    this.name = wikiData.name;
    this.label = year ? `${type} 20${year}` : type;
    this.isOpenEv = this.name === 'openev';
    this.processed = [];
    this.errors = [];
    this.files = [];
    this.downloadQueue = new Queue<Round>();
  }

  async createEvidenceSet() {
    this.evidenceSet = await db.evidenceSet.upsert({
      where: { name: this.name },
      create: { name: this.name, label: this.label },
      update: {},
    });
  }

  async loadRounds() {
    this.roundData = (
      await wikiRequest(`https://openev.debatecoaches.org/rest/wikis/${this.name}/classes/Caselist.RoundClass/objects`)
    )?.objectSummaries;

    if (!this.roundData?.length) throw new Error(`Failed to load round data for ${this.name}`);
  }

  async addRounds() {
    for (const round of this.roundData) {
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
    const round = this.downloadQueue.dequeue();
    if (!round) return setTimeout(() => this.download(), 10000);
    if (!round.openSourceUrl) return setImmediate(() => this.download());

    const { wiki, school, team, side, tournament, roundNum } = round;
    const fPath = path.join(process.env.DOCUMENT_PATH, wiki, school, team, side, `${tournament}-Round${roundNum}.docx`);
    const file = await wikiDowload(round.openSourceUrl, fPath);

    if (file.hasOwnProperty('err')) {
      let error = (file as { err: RequestError }).err;
      const skipped = error.message === 'Not docx' || error.status === 404;
      const updated = await db.round.update({
        where: { gid: round.gid },
        data: { status: skipped ? 'PROCESSED' : 'ERROR' },
      });

      if (!skipped) {
        console.error(`Failed to load file ${fPath} from ${round.openSourceUrl}`, error);
        this.errors.push({ ...updated, error, skipped });
      }
    } else {
      const fileId = await addFile({
        name: path.basename(fPath),
        path: fPath,
        evidenceSet: { connect: { name: this.evidenceSet.name } },
      });

      await db.round.update({
        where: { gid: round.gid },
        data: { openSource: { connect: { gid: fileId } }, status: 'PROCESSED' },
      });
      this.files.push(fileId);
    }
    setImmediate(() => this.download());
  }

  getStatus() {
    const errors = countBy(this.errors, 'skipped');
    return {
      label: this.label,
      downloaded: this.files.length,
      processed: this.roundData ? this.processed.length : 0,
      loaded: this.roundData ? this.roundData.length : 'Loading...',
      skipped: errors.true || 0,
      errors: errors.false || 0,
    };
  }
}

async function loadWikis() {
  const wikiData = await wikiRequest(`https://openev.debatecoaches.org/rest/wikis/`);

  if (!wikiData?.wikis) throw new Error('Failed to load wikis');
  const wikis: Wiki[] = wikiData.wikis.map((data) => new DebateWiki(data));
  await Promise.all(wikis.map((wiki) => wiki.createEvidenceSet()));

  return wikis;
}

async function main() {
  console.log('Loading wikis');
  const wikis = (await loadWikis()).filter((wiki) => !wiki.isOpenEv); // handle openev seperatley
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

  await Promise.all(wikis.map((wiki) => wiki.loadRounds()));
  wikis.forEach((wiki) => wiki.download());
  await Promise.all(wikis.map((wiki) => wiki.addRounds()));

  clearInterval(logger);
  console.log('Done!');
}

export default {
  main,
  name: 'wiki',
};
