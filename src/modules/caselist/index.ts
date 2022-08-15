import addCaselist, { onSchoolLoaded } from 'app/actions/addCaselist';
import addSchool, { onTeamLoaded } from 'app/actions/addSchool';
import addTeam from 'app/actions/addTeam';
import { ActionQueue } from 'app/lib';
import { caselistApi } from 'app/lib/caselist';

// Concurrency doesn't really matter since api is ratelimited
export default {
  name: 'caselist',
  caselistQueue: new ActionQueue(addCaselist, 2, null, async () => {
    const { body: data } = await caselistApi.getCaselists(true);
    console.log(`Loaded ${data.length} caselists`);
    return data;
  }),
  schoolQueue: new ActionQueue(addSchool, 2, onSchoolLoaded),
  teamQueue: new ActionQueue(addTeam, 2, onTeamLoaded),
};
