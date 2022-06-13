import { db, TypedEvent } from 'app/lib';
import { loadRound, RoundInfo } from 'app/lib/debate-tools/wiki';
import path from 'path';
import { DownloadInfo } from './downloadFile';

export const onAddRound = new TypedEvent<DownloadInfo>();
export default async ({ url, roundId, gid }: RoundInfo): Promise<{ gid: string }> => {
  const existing = await db.round.findUnique({ where: { gid } });
  if (existing) return existing;

  const data = { gid, ...(await loadRound(url, roundId)) };
  if (data.status === 'PENDING') {
    const { wiki, school, team, side, tournament, roundNum } = data;
    onAddRound.emit({
      url: data.openSourceUrl,
      filePath: path.join(process.env.DOCUMENT_PATH, wiki, school, team, side, `${tournament}-Round${roundNum}.docx`),
      evidenceSet: wiki,
    });
  }

  return db.round.upsert({
    where: { gid },
    create: data,
    update: data,
    select: { gid: true },
  });
};
