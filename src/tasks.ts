import 'dotenv/config';
import 'reflect-metadata';
import type { Worker } from 'bullmq';

const WORKER_MODULES: Record<string, () => Record<string, unknown>> = {
  caselist: () => require('./modules/caselist/worker'),
  parser: () => require('./modules/parser/worker'),
  dedup: () => require('./modules/deduplicator/worker'),
  search: () => require('./modules/search/worker'),
};

const ALL_MODULES = Object.keys(WORKER_MODULES);

function parseArgs(): string[] {
  const args = process.argv.slice(2);

  if (args.length === 0) return ALL_MODULES;

  const unknown = args.filter((a) => !WORKER_MODULES[a]);
  if (unknown.length > 0) {
    console.error(`Unknown worker module(s): ${unknown.join(', ')}`);
    console.error(`Available: ${ALL_MODULES.join(', ')}`);
    process.exit(1);
  }
  return args;
}

const modules = parseArgs();
const workers: Worker[] = [];
for (const mod of modules) {
  for (const exported of Object.values(WORKER_MODULES[mod]())) {
    if (exported && typeof (exported as Worker).close === 'function') workers.push(exported as Worker);
  }
}
console.log(`Task workers started: ${modules.join(', ')} (${workers.length} workers)`);

// Without this, `docker stop` kills jobs mid-flight and they stay invisible
// until their 5 minute lock expires.
let shuttingDown = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, closing ${workers.length} workers...`);
    await Promise.allSettled(workers.map((worker) => worker.close()));
    console.log('Workers closed');
    process.exit(0);
  });
}
