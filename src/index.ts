import addFile from 'app/actions/addFile';
import generateFile from 'app/actions/generateFile';
import 'app/modules/parser';
import 'app/modules/deduplicator';
import { db } from './lib';
import { readdir, writeFile } from 'fs/promises';
import { DefaultApi as CaselistApi, DefaultApiApiKeys } from './constants/caselist/api';

async function loadDir(dir: string) {
  const files = (await readdir(dir)).map((file) => ({
    name: file,
    path: `${dir}/${file}`,
  }));

  for (const file of files) await addFile(file);
}

async function makeFile(id: number) {
  const ids = (
    await db.evidence.findMany({
      where: { fileId: id },
    })
  ).map((card) => card.id);
  const file = await generateFile(ids, true);
  await writeFile('./test.docx', file);
  console.log('File built');
}

(async () => {
  try {
    console.log('Creating client');
    const caselist = new CaselistApi();
    caselist.setApiKey(DefaultApiApiKeys.cookie, process.env.CASELIST_TOKEN);
    const data = await caselist.getCaselists();
    console.log(data.body);
  } catch (error) {
    console.error(error);
  }
})();
