import addFile from 'app/actions/addFile';
// import generateFile from 'app/actions/generateFile';
import 'app/modules/parser';
import 'app/modules/deduplicator';
import { db } from './lib';
import { readdir, writeFile } from 'fs/promises';

async function loadDir(dir: string) {
  const files = (await readdir(dir)).map((file) => ({
    name: file,
    path: `${dir}/${file}`,
  }));

  // for (const file of files) await addFile(file);
}

// async function makeFile(id: number) {
//   const ids = (
//     await db.evidence.findMany({
//       where: { fileId: id },
//     })
//   ).map((card) => card.id);
//   const file = await generateFile(ids, true);
//   await writeFile('./test.docx', file);
//   console.log('File built');
// }

(async () => {
  try {
    // wiki.main();
    // dedup
    const files = await readdir('/Users/arvindb/Downloads/2020OpenEv');
    for (const file of files) {
      await addFile({
        name: file,
        path: `/Users/arvindb/Downloads/2020OpenEv/${file}`,
      });
    }
    // const ev = await db.evidence.findMany({
    //   where: {
    //     fileId: 1,
    //   },
    // });
    // console.log(ev.length);
    // const res = await generateFile(
    //   ev.map((e) => e.id),
    //   true,
    // );
    // await writeFile('./test.docx', res);
  } catch (error) {
    console.error(error);
  }
})();
