import addFile from 'app/actions/addFile';
import generateFile from 'app/actions/generateFile';
// import 'app/modules/parser';
// import 'app/modules/deduplicator';
import { db } from './lib';
import { readdir, writeFile } from 'fs/promises';
import caselist from './modules/caselist';

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
    await caselist.openevQueue.load();
    await caselist.caselistQueue.load();
  } catch (error) {
    console.error(error);
  }
})();
