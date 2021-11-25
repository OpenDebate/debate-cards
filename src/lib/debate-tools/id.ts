import { createHash } from 'crypto';
import { PathLike, promises as fs } from 'fs';

/**
 * Creates a gid for a file bases on hash, returns function to generate sequential child ids
 * @param  {PathLike|Buffer} path Path to document
 * @return  File gid and child id generator
 */
export const makeId = async (
  path: PathLike,
): Promise<{
  fileId: string;
  makeChildId: (index: number) => string;
}> => {
  const file = typeof path == 'string' ? await fs.readFile(path) : path;

  const sha256 = createHash('sha256');
  sha256.update(file as Buffer);

  const fileId = sha256.digest('base64').replaceAll('/', '_').replaceAll('+', '-').slice(0, 6).toUpperCase();

  const _makeChildId = (index: number) => makeChildId(fileId, index);

  return { fileId, makeChildId: _makeChildId };
};

export const makeChildId = (fileGid: string, index: number): string =>
  fileGid + index.toString(16).padStart(4, '0').toUpperCase();

export const parseId = (id: string): { fileId: string; childId: string } => {
  const fileId = id.slice(0, 6);
  const childId = id.slice(6);

  return { fileId, childId };
};
