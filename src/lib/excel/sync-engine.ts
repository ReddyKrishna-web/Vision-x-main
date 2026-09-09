import { db, audit } from '@/lib/db';
import { syncRegistrationToWorkbook } from './workbook';

// Serialized sync processor: application-level mutex so concurrent registrations
// can never interleave workbook read-modify-write cycles.
let chain: Promise<void> = Promise.resolve();
let booted = false;

const MAX_RETRIES = Number(process.env.EXCEL_SYNC_MAX_RETRIES || 5);

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(() => undefined, () => undefined);
  return next;
}

export function processSyncJob(jobId: number): Promise<void> {
  return runSerialized(async () => {
    const job: any = db().prepare('SELECT * FROM excel_sync_jobs WHERE id=?').get(jobId);
    if (!job || job.sync_status === 'SUCCESS') return;
    const now = new Date().toISOString();
    db().prepare(`UPDATE excel_sync_jobs SET sync_status='PROCESSING', attempt_count=attempt_count+1, updated_at=? WHERE id=?`).run(now, jobId);
    audit('EXCEL_SYNC_STARTED', '', job.registration_id, `job=${jobId}`);
    try {
      await syncRegistrationToWorkbook(job.registration_id);
      db().prepare(`UPDATE excel_sync_jobs SET sync_status='SUCCESS', last_error='', last_synced_at=?, updated_at=? WHERE id=?`)
        .run(new Date().toISOString(), new Date().toISOString(), jobId);
      audit('EXCEL_SYNC_SUCCESS', '', job.registration_id, `job=${jobId}`);
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 500);
      const fresh: any = db().prepare('SELECT attempt_count FROM excel_sync_jobs WHERE id=?').get(jobId);
      const status = (fresh?.attempt_count || 0) >= MAX_RETRIES ? 'FAILED' : 'RETRY_REQUIRED';
      db().prepare(`UPDATE excel_sync_jobs SET sync_status=?, last_error=?, updated_at=? WHERE id=?`)
        .run(status, msg, new Date().toISOString(), jobId);
      audit('EXCEL_SYNC_FAILED', '', job.registration_id, `job=${jobId} err=${msg}`);
    }
  });
}

export async function processPendingSyncs(limit = 25): Promise<{ processed: number }> {
  const rows: any[] = db().prepare(
    `SELECT id FROM excel_sync_jobs WHERE sync_status IN ('PENDING','RETRY_REQUIRED') ORDER BY id LIMIT ?`,
  ).all(limit);
  for (const r of rows) await processSyncJob(r.id);
  return { processed: rows.length };
}

// Fire-and-forget trigger (never blocks registration/payment responses).
export function triggerSync(registrationId: string) {
  if (process.env.EXCEL_SYNC_ENABLED === 'false') return;
  try {
    const { enqueueSync } = require('./sync-queue') as typeof import('./sync-queue');
    const id = enqueueSync(registrationId);
    if (id) {
      // Immediate attempt in background; failures stay as retryable jobs.
      setImmediate(() => { processSyncJob(id).catch(() => {}); });
    }
  } catch { /* sync must never break registration */ }
}

// Startup recovery: requeue stuck PROCESSING jobs, then drain pending (no duplicates — upsert by key).
export async function recoverPendingSyncs() {
  if (booted) return;
  booted = true;
  try {
    db().prepare(`UPDATE excel_sync_jobs SET sync_status='PENDING', updated_at=? WHERE sync_status='PROCESSING'`)
      .run(new Date().toISOString());
    await processPendingSyncs(50);
  } catch { /* best effort */ }
}
