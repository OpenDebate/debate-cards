import { makeId } from 'app/lib/debate-tools';
import { db } from 'app/lib';
import { readFile } from 'fs/promises';
import { Prisma } from '@prisma/client';
import { markDirty } from 'app/modules/search/dirty';

type ExcludedFileFields = 'gid' | 'status';
export type FileData = Omit<Prisma.FileCreateInput, ExcludedFileFields>;

export default async (data: FileData): Promise<{ gid: string }> => {
  const buffer = await readFile(data.path);
  const { fileId: gid } = await makeId(buffer);

  try {
    await db.file.upsert({
      where: { gid },
      create: { ...data, gid, status: 'PENDING' },
      update: data,
      select: { gid: true },
    });
  } catch (e) {
    console.error('Failed to add file:', JSON.stringify(data, null, 2));
    throw e;
  }

  // A file seen again can have new tags, and its cards carry them in the search index
  const cards = await db.evidence.findMany({ where: { file: { gid } }, select: { id: true } });
  if (cards.length) await markDirty(cards.map((card) => card.id));

  return { gid };
};
