import { Prisma } from '@prisma/client';
import { db, TypedEvent } from 'app/lib';
import { omit } from 'lodash';

type EvidenceData = Omit<Prisma.EvidenceCreateInput, 'file'> & { file: Prisma.FileWhereUniqueInput };

export const onAddEvidence = new TypedEvent<{ gid: string }>();

export default async (data: EvidenceData): Promise<void> => {
  const evidence = await db.evidence.upsert({
    where: {
      gid: data.gid,
    },
    create: {
      ...omit(data, 'file', 'index'),
      file: {
        connect: {
          gid: data.file.gid,
        },
      },
    },
    update: {
      ...omit(data, 'file', 'index'),
    },
  });

  onAddEvidence.emit({ gid: evidence.gid });
  return;
};
