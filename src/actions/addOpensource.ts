import { Prisma } from '@prisma/client';
import { connectOrCreateTag, TagInput } from 'app/lib';
import path from 'path';
import addFile from './addFile';
import downloadFile from './downloadFile';

const DOCUMENT_DIR = process.env.DOCUMENT_PATH || './documents';

export type OpensourceLoadedEvent = {
  id: number;
  filePath: string;
  tags: TagInput[];
  expectCached?: boolean;
};

export default async ({ id, filePath, tags, expectCached }: OpensourceLoadedEvent): Promise<{ gid: string } | null> => {
  try {
    await downloadFile(filePath, expectCached);
    return await addFile({
      path: `${DOCUMENT_DIR}/${filePath}`,
      name: path.parse(filePath).name,
      round: { connect: { id } },
      tags: { connectOrCreate: tags.map(connectOrCreateTag) },
    });
  } catch (err) {
    if (err === 'skipping' || err?.statusCode === 404) return null;
    throw err;
  }
};
