import { Prisma } from '@prisma/client';
import { db } from 'app/lib';
import { omit } from 'lodash';

type EvidenceData = Omit<Prisma.EvidenceCreateInput, 'file'> & { file: Prisma.FileWhereUniqueInput };

export default async (data: EvidenceData): Promise<{ gid: string; id: number }> => {
  const evidence = await db.evidence.upsert({
    where: { gid: data.gid },
    create: {
      ...omit(data, 'file', 'index'),
      file: { connect: { gid: data.file.gid } },
    },
    update: { ...omit(data, 'file', 'index') },
    select: { gid: true, id: true },
  });

  return { gid: evidence.gid, id: evidence.id };
};
