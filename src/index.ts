import 'dotenv/config';
import { loadCaselists, loadOpenev } from './modules/caselist/flow';
import { connection } from './lib/queues/connection';
import { caselistQueue, openevQueue, schoolQueue, teamQueue, opensourceQueue, updateQueue } from './modules/caselist/queue';

const command = process.argv[2] || 'hspolicy24';

// Parse optional key=value args e.g. schoolNameAlphaLimit=D
const args = Object.fromEntries(
  process.argv.slice(3).map((arg) => arg.split('=')),
);

(async () => {
  if (command === 'openev') {
    const years = process.argv.slice(3).map(Number).filter(Boolean);
    console.log(`Loading openev`, years.length > 0 ? { years } : '(all years)');
    const count = await loadOpenev(years.length > 0 ? years : undefined);
    console.log(`Enqueued ${count} openev file(s). Jobs will be processed by the task workers.`);
  } else {
    console.log(`Loading caselist: ${command}`, args);
    const count = await loadCaselists({
      names: [command],
      schoolNameAlphaLimit: args.schoolNameAlphaLimit,
      expectCached: args.expectCached === 'true',
    });
    console.log(`Enqueued ${count} caselist(s). Jobs will be processed by the task workers.`);
  }
  // Workers run in tasks.ts; close cleanly so pending Redis writes flush
  await Promise.all([caselistQueue, openevQueue, schoolQueue, teamQueue, opensourceQueue, updateQueue].map((q) => q.close()));
  await connection.quit();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
