import { db, audit } from '@/lib/db';

// Excel sync job tracking. Registration success NEVER depends on sync success.
export type SyncStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRY_REQUIRED';

export function enqueueSync(registrationId: string, entityType = 'REGISTRATION', entityId = '') {
  if (process.env.EXCEL_SYNC_ENABLED === 'false') return null;
  try {
    // Coalesce: one pending job per (registration, entity) — update timestamp instead of duplicating.
    const existing: any = db().prepare(
      `SELECT * FROM excel_sync_jobs WHERE registration_id=? AND entity_type=? AND entity_id=? AND sync_status IN ('PENDING','PROCESSING','FAILED','RETRY_REQUIRED') ORDER BY id DESC LIMIT 1`,
    ).get(registrationId, entityType, entityId || registrationId);
    const now = new Date().toISOString();
    if (existing) {
      db().prepare(`UPDATE excel_sync_jobs SET sync_status='PENDING', updated_at=? WHERE id=?`).run(now, existing.id);
      return existing.id;
    }
    const r: any = db().prepare(
      `INSERT INTO excel_sync_jobs (registration_id, entity_type, entity_id, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
    ).run(registrationId, entityType, entityId || registrationId, 'PENDING', now, now);
    audit('EXCEL_SYNC_CREATED', '', registrationId, entityType);
    return Number(r.lastInsertRowid);
  } catch {
    return null;
  }
}

export function getSyncHealth() {
  try {
    const counts: any[] = db().prepare(`SELECT sync_status s, COUNT(*) c FROM excel_sync_jobs GROUP BY sync_status`).all();
    const by: Record<string, number> = {};
    for (const r of counts) by[r.s] = r.c;
    const last: any = db().prepare(`SELECT * FROM excel_sync_jobs WHERE sync_status='SUCCESS' ORDER BY last_synced_at DESC LIMIT 1`).get();
    const lastErr: any = db().prepare(`SELECT * FROM excel_sync_jobs WHERE sync_status IN ('FAILED','RETRY_REQUIRED') ORDER BY updated_at DESC LIMIT 1`).get();
    return {
      pending: by.PENDING || 0,
      processing: by.PROCESSING || 0,
      failed: (by.FAILED || 0) + (by.RETRY_REQUIRED || 0),
      success: by.SUCCESS || 0,
      lastSyncedAt: last?.last_synced_at || null,
      lastError: lastErr?.last_error || null,
      healthy: ((by.FAILED || 0) + (by.RETRY_REQUIRED || 0)) === 0,
    };
  } catch {
    return { pending: 0, processing: 0, failed: 0, success: 0, lastSyncedAt: null, lastError: null, healthy: true };
  }
}
