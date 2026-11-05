import { caselistApi } from 'app/lib/caselist';
import { access, mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

const DOCUMENT_DIR = process.env.DOCUMENT_PATH || './documents';

export default async (path: string): Promise<void> => {
  const outputPath = `${DOCUMENT_DIR}/${path}`;
  try {
    // If file already exists don't redownload
    await access(outputPath);
    console.log(`File already exists at ${outputPath}, skipping download`);
  } catch (e) {
    await mkdir(dirname(outputPath), { recursive: true });
    return writeFile(outputPath, (await caselistApi.getDownload(path)).body);
  }
};
