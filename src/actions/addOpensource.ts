import { Prisma } from '@prisma/client';
import { connectOrCreateTag, TagInput } from 'app/lib';
import path from 'path';
import addFile from './addFile';
import downloadFile from './downloadFile';

export type OpensourceLoadedEvent = {
  id: number;
  filePath: string;
  tags: TagInput[];
};

export default async ({ id, filePath, tags }: OpensourceLoadedEvent): Promise<void> => {
  try {
    await downloadFile(filePath);
    await addFile({
      path: `./documents/${filePath}`,
      name: path.parse(filePath).name,
      round: { connect: { id } },
      tags: { connectOrCreate: tags.map(connectOrCreateTag) },
    });
  } catch (err) {
    if (err === 'skipping') return;
    console.error(
      `Error loading ${filePath} for round with id ${id}: `,
      err.statusCode === 404 ? 'File not Found' : err,
    );
  }
};
