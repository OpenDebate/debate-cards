import { Prisma } from '@prisma/client';
import { db } from 'app/lib';
import { TextField } from './mapping';

export const evidenceSelect = Prisma.validator<Prisma.EvidenceSelect>()({
  id: true,
  gid: true,
  tag: true,
  cite: true,
  fullcite: true,
  summary: true,
  spoken: true,
  fulltext: true,
  pocket: true,
  hat: true,
  block: true,
  bucketId: true,
  bucket: { select: { count: true } },
  file: { select: { tags: { select: { name: true } } } },
});
export type EvidenceRow = Prisma.EvidenceGetPayload<{ select: typeof evidenceSelect }>;

export type EvidenceDoc = { id: number; gid: string; bucketId: number | null; groupKey: string; duplicateCount: number; tags: string[] } & Record<
  TextField,
  string | null
>;

export const groupKeyFor = (id: number, bucketId: number | null): string => (bucketId != null ? `b${bucketId}` : `c${id}`);

export const toDoc = (row: EvidenceRow): EvidenceDoc => ({
  id: row.id,
  gid: row.gid,
  tag: row.tag,
  cite: row.cite,
  fullcite: row.fullcite,
  summary: row.summary,
  spoken: row.spoken,
  fulltext: row.fulltext,
  pocket: row.pocket,
  hat: row.hat,
  block: row.block,
  bucketId: row.bucketId,
  groupKey: groupKeyFor(row.id, row.bucketId),
  duplicateCount: Math.max(1, row.bucket?.count ?? 1),
  tags: row.file?.tags.map((tag) => tag.name) ?? [],
});

/** Current index documents for these cards. Cards that no longer exist are simply absent from the result. */
export const buildDocuments = async (ids: number[]): Promise<EvidenceDoc[]> =>
  (await db.evidence.findMany({ where: { id: { in: ids } }, select: evidenceSelect })).map(toDoc);
