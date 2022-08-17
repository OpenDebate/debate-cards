import { CAMP_NAMES, OPENEV_TYPES } from 'app/constants/openevNames';
import { ModelFile } from 'app/constants/caselist/api';
import { connectOrCreateTag } from 'app/lib';
import addFile from './addFile';
import downloadFile from './downloadFile';

export default async (data: ModelFile): Promise<void> => {
  await downloadFile(data.path);
  const campName = CAMP_NAMES[data.camp] ?? data.camp;
  const tags = [
    connectOrCreateTag('openev', 'Open Evidence'),
    connectOrCreateTag(data.year.toString(), data.year.toString()),
    connectOrCreateTag(data.camp, `${campName} Camp`),
  ];
  if (data.lab) tags.push(connectOrCreateTag(data.lab, `${data.year} ${campName} ${data.lab} Lab`));
  // Sent as strigified object for some reason
  if (data.tags)
    for (const tag in JSON.parse(data.tags)) {
      // Some old ones had imp instead of impact
      const fixedTag = tag === 'imp' ? 'impact' : tag;
      tags.push(connectOrCreateTag(fixedTag, `Openev ${OPENEV_TYPES[fixedTag] ?? tag}`));
    }

  return addFile({
    name: data.name,
    path: `./documents/${data.path}`,
    tags: { connectOrCreate: tags },
  });
};
