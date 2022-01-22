import addFile from 'app/actions/addFile';
import 'app/modules/parser';
import { readdir } from 'fs/promises';

async function loadDir(dir: string) {
  const files = (await readdir(dir)).map((file) => ({
    name: file,
    path: `${dir}/${file}`,
  }));

  for (const file of files) await addFile(file);
}

(async () => {
  try {
  } catch (error) {
    console.error(error);
  }
})();
