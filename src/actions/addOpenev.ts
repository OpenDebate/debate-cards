import { CAMP_NAMES, OPENEV_TYPES } from 'app/constants/caselistNames';
import { ModelFile } from 'app/constants/caselist/api';
import { connectOrCreateTag, TagInput } from 'app/lib';
import addFile from './addFile';
import downloadFile from './downloadFile';
import { access } from 'fs/promises';

const DOCUMENT_DIR = process.env.DOCUMENT_PATH || './documents';

export default async (data: ModelFile): Promise<{ gid: string }> => {
  const filePath = `${DOCUMENT_DIR}/${data.path}`;
  let cached = false;
  try {
    await access(filePath);
    cached = true;
  } catch {
    await downloadFile(data.path);
  }
  console.log(`[openev] ${cached ? 'cached' : 'downloaded'}: ${data.name}`);
  const campName = CAMP_NAMES[data.camp] ?? data.camp;
  const tags: TagInput[] = [
    { name: 'openev', label: 'Open Evidence' },
    { name: 'hs', label: 'High school' },
    { name: data.year.toString(), label: data.year.toString() },
    { name: data.camp, label: `${campName} Camp` },
  ];
  if (data.lab)
    tags.push({ name: `${data.year}${data.camp}:${data.lab}`, label: `${data.year} ${campName} ${data.lab} Lab` });
  // Sent as strigified object for some reason
  if (data.tags)
    for (const tag in JSON.parse(data.tags)) {
      // Some old ones had imp instead of impact
      const fixedTag = tag === 'imp' ? 'impact' : tag;
      const label = tag === 'ld' ? 'Lincoln Douglas' : `Openev ${OPENEV_TYPES[fixedTag] ?? tag}`;
      tags.push({ name: fixedTag, label });
    }
  if (!tags.find((tag) => tag.name === 'ld')) tags.push({ name: 'cx', label: 'Policy' });

  return await addFile({
    name: data.name,
    path: `${DOCUMENT_DIR}/${data.path}`,
    tags: { connectOrCreate: tags.map(connectOrCreateTag) },
  });
};
