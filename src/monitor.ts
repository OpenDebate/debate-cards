import 'dotenv/config';
import { Queue } from 'bullmq';
import { connection } from 'app/lib/queues/connection';

const POLL_INTERVAL = 5_000; // 5 seconds

const queueNames = ['caselist', 'school', 'team', 'opensource', 'parse', 'dedup', 'openev', 'update'];
const queues = queueNames.map((name) => new Queue(name, { connection }));

const IDLE_THRESHOLD = 15_000; // 15 seconds

type QueueCounts = { waiting: number; active: number; completed: number; failed: number };
type Snapshot = Record<string, QueueCounts>;

let startTime: number;
let lastSnapshot: Snapshot = {};
let lineCount = 0;
// Tracks when each queue last had a change in completed+failed count
const lastChangeTime: Record<string, number> = {};

async function getSnapshot(): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (const queue of queues) {
    const raw = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    snapshot[queue.name] = {
      waiting: raw.waiting ?? 0,
      active: raw.active ?? 0,
      completed: raw.completed ?? 0,
      failed: raw.failed ?? 0,
    };
  }
  return snapshot;
}

function renderTable(current: Snapshot, elapsed: number, now: number): string {
  const elapsedMin = elapsed / 60_000;
  const lines: string[] = [];

  lines.push(
    'Queue'.padEnd(12) +
      'Wait'.padStart(8) +
      'Active'.padStart(8) +
      'Done'.padStart(8) +
      'Fail'.padStart(8) +
      'Rate/min'.padStart(10) +
      '\u0394/5s'.padStart(8) +
      '  Status',
  );
  lines.push('-'.repeat(72));

  let totalCompleted = 0;
  let totalFailed = 0;

  for (const name of queueNames) {
    const c = current[name];
    const prev = lastSnapshot[name];
    const delta = prev ? c.completed - prev.completed : 0;
    const rate = elapsedMin > 0 ? (c.completed / elapsedMin).toFixed(1) : '0';

    totalCompleted += c.completed;
    totalFailed += c.failed;

    if (c.waiting > 0 || c.active > 0 || c.completed > 0 || c.failed > 0) {
      const idleMs = lastChangeTime[name] ? now - lastChangeTime[name] : null;
      const isIdle = idleMs !== null && idleMs >= IDLE_THRESHOLD;
      const status = isIdle ? `idle ${Math.floor(idleMs / 1000)}s` : 'active';

      lines.push(
        name.padEnd(12) +
          String(c.waiting).padStart(8) +
          String(c.active).padStart(8) +
          String(c.completed).padStart(8) +
          String(c.failed).padStart(8) +
          rate.padStart(10) +
          ('+' + delta).padStart(8) +
          `  ${status}`,
      );
    }
  }

  const mins = Math.floor(elapsed / 60_000);
  const secs = Math.floor((elapsed % 60_000) / 1000);
  lines.push('-'.repeat(62));
  lines.push(`${mins}m${secs}s elapsed | ${totalCompleted} completed | ${totalFailed} failed`);

  return lines.join('\n');
}

function printInPlace(table: string) {
  // Move cursor up to overwrite previous table
  if (lineCount > 0) {
    process.stdout.write(`\x1b[${lineCount}A`);
  }
  const lines = table.split('\n');
  for (const line of lines) {
    process.stdout.write(`\x1b[2K${line}\n`); // clear line then write
  }
  lineCount = lines.length;
}

async function main() {
  console.log('Monitoring queue stats... (Ctrl+C for summary)\n');
  startTime = Date.now();
  lastSnapshot = await getSnapshot();

  const interval = setInterval(async () => {
    const now = Date.now();
    const current = await getSnapshot();
    const elapsed = now - startTime;

    for (const name of queueNames) {
      const prev = lastSnapshot[name];
      const c = current[name];
      if (prev && (c.completed !== prev.completed || c.failed !== prev.failed)) {
        lastChangeTime[name] = now;
      } else if (!lastChangeTime[name] && (c.completed > 0 || c.failed > 0)) {
        lastChangeTime[name] = now;
      }
    }

    const table = renderTable(current, elapsed, now);
    printInPlace(table);
    lastSnapshot = current;
  }, POLL_INTERVAL);

  process.on('SIGINT', async () => {
    clearInterval(interval);
    const final = await getSnapshot();
    const elapsed = Date.now() - startTime;
    const elapsedMin = elapsed / 60_000;

    // Print final table below the in-place one
    process.stdout.write('\n\n');
    console.log('=== THROUGHPUT SUMMARY ===\n');
    for (const name of queueNames) {
      const c = final[name];
      if (c.completed > 0 || c.failed > 0) {
        console.log(
          `  ${name.padEnd(12)} ${String(c.completed).padStart(6)} done  ${String(c.failed).padStart(5)} fail  ${(c.completed / elapsedMin).toFixed(1).padStart(8)}/min`,
        );
      }
    }
    const totalMins = Math.floor(elapsed / 60_000);
    const totalSecs = Math.floor((elapsed % 60_000) / 1000);
    console.log(`\n  Total time: ${totalMins}m${totalSecs}s`);
    process.exit(0);
  });
}

main();
