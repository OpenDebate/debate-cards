import { makeId } from 'app/lib/debate-tools';
import { ActionQueue, db, TypedEvent } from 'app/lib';
import { readFile } from 'fs/promises';
import { Prisma } from '@prisma/client';

// interface AddFileData = Omit;
type ExcludedFileFields = 'gid' | 'status';
export type FileData = Omit<Prisma.FileCreateInput, ExcludedFileFields>;

export const onAddFile = new TypedEvent<{ gid: string }>();
const onFileLoaded = new TypedEvent<{ data: FileData & { gid: string }; resolve: (value: unknown) => void }>();

new ActionQueue(
  'file',
  async ({ data, resolve }: { data: FileData & { gid: string }; resolve: () => void }): Promise<void> => {
    try {
      const doc = await db.file.upsert({
        where: { gid: data.gid },
        create: { ...data, status: 'PENDING' },
        update: data,
        select: { gid: true },
      });
      onAddFile.emit({ gid: doc.gid });
    } catch (e) {
      console.error('Failed to add file:', JSON.stringify(data, null, 2));
    } finally {
      resolve();
    }
  },
  1,
  onFileLoaded,
);

export default async (data: FileData): Promise<void> => {
  const buffer = await readFile(data.path);

  const { fileId: gid } = await makeId(buffer);
  new Promise((resolve) => onFileLoaded.emit({ data: { ...data, gid }, resolve }));
};
