import { createHash } from 'crypto';
import { PathLike, promises as fs } from 'fs';

/**
 * Creates a gid for a file bases on hash, returns function to generate sequential child ids
 * @param  {PathLike|Buffer} path Path to document
 * @return  File gid and child id generator
 */
export const makeId = async (
  path: PathLike | Buffer,
): Promise<{
  fileId: string;
  makeChildId: (index: number) => string;
}> => {
  const file = await fs.readFile(path);
  const sha256 = createHash('sha256');
  sha256.update(file);

  const fileId = sha256.digest('base64').replaceAll('/', '_').replaceAll('+', '-').slice(0, 6);

  const makeChildId = (index: number) => fileId + index.toString(16).padStart(4, '0');

  return { fileId, makeChildId };
};
