import addCaselist, { onSchoolLoaded } from 'app/actions/addCaselist';
import addOpenev from 'app/actions/addOpenev';
import addSchool, { onTeamLoaded } from 'app/actions/addSchool';
import addTeam from 'app/actions/addTeam';
import { ModelFile } from 'app/constants/caselist/api';
import { ActionQueue } from 'app/lib';
import { caselistApi } from 'app/lib/caselist';

// Concurrency doesn't really matter since api is ratelimited
export default {
  name: 'caselist',
  openevQueue: new ActionQueue(addOpenev, 2, null, async () => {
    const files: ModelFile[] = [];
    for (let year = 2013; year <= 2022; year++) {
      files.push(...(await caselistApi.getFiles(year)).body);
    }
    console.log(`${files.length} openev files loaded`);
    return files;
  }),
  caselistQueue: new ActionQueue(addCaselist, 2, null, async () => {
    const { body: data } = await caselistApi.getCaselists(true);
    console.log(`Loaded ${data.length} caselists`);
    return data;
  }),
  schoolQueue: new ActionQueue(addSchool, 2, onSchoolLoaded),
  teamQueue: new ActionQueue(addTeam, 2, onTeamLoaded),
};
