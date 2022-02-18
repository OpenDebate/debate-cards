import addFile from 'app/actions/addFile';
import generateFile from 'app/actions/generateFile';
import wiki from 'app/modules/wiki';
import 'app/modules/parser';
import { db } from './lib';
import { readdir, writeFile } from 'fs/promises';

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
    wiki.main();
  } catch (error) {
    console.error(error);
  }
})();
