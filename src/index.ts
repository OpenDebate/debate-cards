import 'dotenv/config';
import { loadCaselists } from './modules/caselist/flow';

const caselist = process.argv[2] || 'hspolicy24';

// Parse optional key=value args e.g. schoolNameAlphaLimit=D
const args = Object.fromEntries(
  process.argv.slice(3).map((arg) => arg.split('=')),
);

(async () => {
  console.log(`Loading caselist: ${caselist}`, args);
  const count = await loadCaselists({
    names: [caselist],
    schoolNameAlphaLimit: args.schoolNameAlphaLimit,
    expectCached: args.expectCached === 'true',
  });
  console.log(`Enqueued ${count} caselist(s). Jobs will be processed by the task workers.`);
  // Allow BullMQ to flush, then exit — workers run in tasks.ts
  setTimeout(() => process.exit(0), 2000);
})();
