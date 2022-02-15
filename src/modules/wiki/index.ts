import { EvidenceSet } from '@prisma/client';
import addRound from 'app/actions/addRound';
import { db, timeElapsed, wikiRequest } from 'app/lib';
import { countBy, keyBy, sumBy } from 'lodash';

interface Wiki {
  name: string;
  label: string;
  isOpenEv: boolean;
  evidenceSet: EvidenceSet;
  roundData: any[];
  processed: any[];
  errors: any[];

  createEvidenceSet: () => Promise<void>;
  loadRounds: () => Promise<void>;
  addRounds: () => Promise<void>;
  getStatus: () => Partial<WikiStatus>;
}

interface WikiStatus {
  label: string;
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

  roundData: any[];
  processed: any[];
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
      const pageUrl = round.links[0].href.split('/').slice(0, -2).join('/');
      const data = await addRound(pageUrl, round.number, round.guid);

      if (typeof data === 'string') {
        const skipped = ['Not Found', 'Template'];
        this.errors.push({ ...round, skipped: skipped.includes(data) });
      } else this.processed.push(data);
    }
  }

  getStatus() {
    const errors = countBy(this.errors, 'skipped');
    return {
      label: this.label,
      processed: this.roundData ? this.processed.length : undefined,
      loaded: this.roundData ? this.roundData.length : 0,
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
  const interval = setInterval(() => {
    console.clear();
    console.log('Time elapsed ' + timeElapsed(startTime));
    const statuses = wikis.map((wiki) => wiki.getStatus());
    const totals = {
      label: 'Total',
      processed: sumBy(statuses, 'processed'),
      loaded: sumBy(statuses, ({ loaded }) => (typeof loaded === 'string' ? 0 : loaded)),
      skipped: sumBy(statuses, 'skipped'),
      errors: sumBy(statuses, 'errors'),
    };
    console.table(keyBy(statuses.concat(totals), 'label'));
  }, 1000);

  await Promise.all(wikis.map((wiki) => wiki.loadRounds()));
  await Promise.all(wikis.map((wiki) => wiki.addRounds()));

  clearInterval(interval);
}

export default {
  main,
  name: 'wiki',
};
