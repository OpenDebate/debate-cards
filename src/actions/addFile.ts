import { makeId } from 'app/lib/debate-tools';
import { db, TypedEvent } from 'app/lib';
import { readFile } from 'fs/promises';
import { Prisma } from '@prisma/client';

// interface AddFileData = Omit;
type ExcludedFileFields = 'gid' | 'status';
export type FileData = Omit<Prisma.FileCreateInput, ExcludedFileFields>;

export const onAddFile = new TypedEvent<{ gid: string }>();

export default async (data: FileData): Promise<any> => {
  const buffer = await readFile(data.path);

  const { fileId: gid } = await makeId(buffer);
  console.log(data);
  const doc = await db.file.upsert({
    where: {
      gid,
    },
    create: {
      ...data,
      gid,
      status: 'PENDING',
    },
    update: {
      ...data,
      // status: 'PENDING',
    },
  });

  onAddFile.emit({ gid: doc.gid });

  return;
};
