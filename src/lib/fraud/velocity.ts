import { db } from '@/lib/db';

// Registration/payment velocity: counts recent events to spot bursts.
export function velocitySignals(input: { email?: string; phone?: string; ip?: string }): { count1h: number; count24h: number; sameIp1h: number } {
  let count1h = 0;
  let count24h = 0;
  let sameIp1h = 0;
  try {
    count1h = (db().prepare(`SELECT COUNT(*) c FROM registrations WHERE created_at >= datetime('now','-1 hour')`).get() as any)?.c || 0;
    count24h = (db().prepare(`SELECT COUNT(*) c FROM registrations WHERE created_at >= datetime('now','-24 hours')`).get() as any)?.c || 0;
  } catch { /* tables may not exist yet in tests */ }
  try {
    if (input.ip) {
      sameIp1h = (db().prepare(
        `SELECT COUNT(*) c FROM fraud_events WHERE event_type='REGISTRATION_ATTEMPT' AND ip=? AND created_at >= datetime('now','-1 hour')`,
      ).get(input.ip) as any)?.c || 0;
    }
  } catch { sameIp1h = 0; }
  return { count1h, count24h, sameIp1h };
}

export function failedAttempts(identifier: string): number {
  try {
    return (db().prepare(
      `SELECT COUNT(*) c FROM fraud_events WHERE event_type='PAYMENT_FAILED' AND identifier=? AND created_at >= datetime('now','-24 hours')`,
    ).get(identifier) as any)?.c || 0;
  } catch { return 0; }
}
