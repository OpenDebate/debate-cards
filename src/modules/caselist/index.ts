import addCaselist, { onSchoolLoaded } from 'app/actions/addCaselist';
import addOpenev from 'app/actions/addOpenev';
import addOpensource, { OpensourceLoadedEvent } from 'app/actions/addOpensource';
import addSchool, { onTeamLoaded } from 'app/actions/addSchool';
import addTeam, { onOpensourceLoaded } from 'app/actions/addTeam';
import { Caselist, ModelFile } from 'app/constants/caselist/api';
import { ActionQueue, db } from 'app/lib';
import { caselistApi, openSourceTags } from 'app/lib/caselist';

type CaselistLoadOptions = { archived: boolean; active: boolean; years?: number[]; names?: string[] };
// Concurrency doesn't really matter since api is ratelimited
export default {
  name: 'caselist',
  openevQueue: new ActionQueue('openev', addOpenev, 2, null, async ({ years }: { years?: number[] }) => {
    const files: ModelFile[] = [];
    const defaultYears = [];
    for (let year = 2022; year >= 2013; year--) defaultYears.push(year);

    for (const year of years ?? defaultYears) {
      files.push(...(await caselistApi.getFiles(year)).body);
    }
    return files;
  }),
  caselistQueue: new ActionQueue(
    'caselist',
    addCaselist,
    2,
    null,
    async ({ archived, active, years, names }: CaselistLoadOptions) => {
      let tasks: Caselist[] = [];
      if (archived || years || names) tasks = tasks.concat((await caselistApi.getCaselists(true)).body);
      if (active || years || names) tasks = tasks.concat((await caselistApi.getCaselists(false)).body);
      if (years || names) tasks = tasks.filter((c) => years?.includes(c.year) || names?.includes(c.name));
      return tasks.sort((a, b) => b.year - a.year); // Do more recent years first
    },
  ),
  schoolQueue: new ActionQueue(
    'school',
    addSchool,
    2,
    onSchoolLoaded,
    async ({ caselist, school }: { caselist: string; school: string }) => {
      return [
        {
          caselist: (await caselistApi.getCaselist(caselist)).body,
          school: (await caselistApi.getSchool(caselist, school)).body,
        },
      ];
    },
  ),
  teamQueue: new ActionQueue(
    'team',
    addTeam,
    2,
    onTeamLoaded,
    async ({ caselist, school, team }: { caselist: string; school: string; team: string }) => {
      return [
        {
          caselist: (await caselistApi.getCaselist(caselist)).body,
          school: (await caselistApi.getSchool(caselist, school)).body,
          team: (await caselistApi.getTeam(caselist, school, team)).body,
        },
      ];
    },
  ),
  opensourceQueue: new ActionQueue(
    'opensource',
    addOpensource,
    5,
    onOpensourceLoaded,
    async ({ loadPending }: { loadPending: boolean }) => {
      let tasks: OpensourceLoadedEvent[] = [];
      if (loadPending) {
        const rounds = await db.round.findMany({
          where: { AND: [{ opensourcePath: { not: null } }, { opensource: { is: null } }] },
          select: {
            id: true,
            side: true,
            opensourcePath: true,
            team: {
              select: {
                name: true,
                displayName: true,
                school: {
                  select: {
                    name: true,
                    displayName: true,
                    caselist: { select: { name: true, displayName: true, year: true, level: true, event: true } },
                  },
                },
              },
            },
          },
        });
        tasks = tasks.concat(
          rounds.map((round) => {
            const team = round.team;
            const school = team.school;
            const caselist = school.caselist;
            return {
              id: round.id,
              filePath: round.opensourcePath,
              tags: openSourceTags({ caselist, school, team, round }),
            };
          }),
        );
      }
      return tasks;
    },
  ),
};
