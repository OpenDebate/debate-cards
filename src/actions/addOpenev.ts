import { ModelFile } from 'app/constants/caselist/api';
import addFile from './addFile';
import downloadFile from './downloadFile';

export default async ({ name, path }: ModelFile): Promise<void> => {
  await downloadFile(path);
  return addFile({ name, path: `./documents/${path}` });
};
