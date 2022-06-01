import { ActionQueue, db } from 'app/lib';
import { loadOpenEv, loadOpenEvs, loadRounds, loadWikis } from 'app/lib/debate-tools/wiki';
import addRound, { onAddRound } from 'app/actions/addRound';
import downloadFile from 'app/actions/downloadFile';
import path from 'path';

const createEvidenceSet = ({ name, label }: { name: string; label: string }): Promise<unknown> =>
  db.evidenceSet.upsert({
    where: { name },
    create: { name, label },
    update: {},
  });

export default {
  name: 'wiki',
  openevQueue: new ActionQueue(downloadFile, 1, onAddRound, async () => {
    const years = await loadOpenEvs();
    console.log(`${years.length} openev years loaded`);
    await Promise.all(years.map(createEvidenceSet));
    const files = (await Promise.all(years.map(loadOpenEv))).flat();
    return files.map(({ url, name, wiki }) => ({
      url,
      filePath: path.join(process.env.DOCUEMNT_PATH, wiki.year, name),
      evidenceSet: wiki.name,
    }));
  }),
  roundQueue: new ActionQueue(addRound, 1, null, async () => {
    const wikis = await loadWikis();
    console.log(`${wikis.length} wikis loaded`);
    await Promise.all(wikis.map(createEvidenceSet));
    const rounds = await Promise.all(wikis.map(loadRounds));
    return rounds.flat();
  }),
};
