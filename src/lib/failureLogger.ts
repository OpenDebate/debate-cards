import fs from 'fs';
import path from 'path';
import { Worker, Job } from 'bullmq';

const LOG_FILE = path.resolve(process.env.FAILURE_LOG_PATH || 'logs/failed-jobs.log');

// Ensure logs dir exists on first use
let logDirReady = false;
function ensureLogDir() {
  if (logDirReady) return;
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  logDirReady = true;
}

// Dedup: key -> total occurrences since process start
const errorCounts = new Map<string, number>();

/**
 * Returns true on the 1st, 10th, 100th, 1000th ... occurrence so
 * repeated identical errors are logged but don't spam the file.
 */
function shouldLog(count: number): boolean {
  return count === 1 || Math.log10(count) % 1 === 0;
}

/**
 * Stable key for grouping the same failure site regardless of variable data
 * in the message (gids, ids, etc.).
 * Uses: queueName + error class name + first stack frame inside /src/
 */
function dedupeKey(queueName: string, err: Error): string {
  const srcFrame =
    err.stack
      ?.split('\n')
      .slice(1)
      .find((l) => l.includes('/src/'))
      ?.trim() ?? err.message.slice(0, 100);
  return `${queueName}:${err.name}:${srcFrame}`;
}

function writeLog(entry: Record<string, unknown>): void {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry, null, 2) + '\n\n');
  } catch (writeErr) {
    // Don't crash the worker over a logging failure
    console.error('[failureLogger] Could not write to log:', writeErr);
  }
}

export function logJobFailure(queueName: string, job: Job, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = dedupeKey(queueName, err);
  const count = (errorCounts.get(key) ?? 0) + 1;
  errorCounts.set(key, count);

  if (!shouldLog(count)) return;

  writeLog({
    ts: new Date().toISOString(),
    queue: queueName,
    jobId: job.id,
    jobName: job.name,
    attempt: job.attemptsMade,
    maxAttempts: job.opts?.attempts ?? 1,
    data: job.data,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    occurrences: count,
  });
}

/**
 * Attach a `failed` event listener to a worker that logs to file.
 * Call this once per worker after creating it.
 */
export function attachFailureLogger(worker: Worker): void {
  worker.on('failed', (job, error) => {
    if (!job) return;
    logJobFailure(worker.name, job, error);
  });
}
