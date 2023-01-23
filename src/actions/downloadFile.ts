import { caselistApi } from 'app/lib/caselist';
import { access, mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

export default async (path: string): Promise<void> => {
  const outputPath = `./documents/${path}`;
  try {
    // If file already exists don't redownload
    await access(outputPath);
  } catch (e) {
    await mkdir(dirname(outputPath), { recursive: true });
    return writeFile(outputPath, (await caselistApi.getDownload(path)).body);
  }
};
