import { db } from 'app/lib/db';
import { wikiDownload } from 'app/lib/request';
import addFile from 'app/actions/addFile';
import path from 'path';

export interface DownloadInfo {
  url: string;
  filePath: string;
  evidenceSet: string;
  roundGid?: string;
}

export default async ({ url, filePath, evidenceSet, roundGid }: DownloadInfo): Promise<void> => {
  try {
    if (!url) return;
    const result = await wikiDownload(url, filePath);
    if ('err' in result) throw new Error(`Failed to download file ${url}: ${result.err.message}`);
    const fileId = await addFile({
      name: path.basename(filePath),
      path: filePath,
      evidenceSet: { connect: { name: evidenceSet } },
    });
    if (roundGid)
      await db.round.update({
        where: { gid: roundGid },
        data: { openSource: { connect: { gid: fileId } }, status: 'PROCESSED' },
      });
  } catch (e) {
    if (roundGid) await db.round.update({ where: { gid: roundGid }, data: { status: 'ERROR' } });
    throw new Error(`Error downloading ${url}: ${e.message}`);
  }
};
