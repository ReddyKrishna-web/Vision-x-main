import { db, audit } from '@/lib/db';
import { normalizeLegacyStatus, assertTransition } from './state-machine';

// Single choke-point for all payment status changes: validates machine transitions,
// stamps timestamps, and writes an audit record.
export function setPaymentStatus(
  paymentId: number,
  to: string,
  opts: { admin?: string; note?: string; event?: string } = {},
) {
  const row: any = db().prepare('SELECT * FROM payments WHERE id=?').get(paymentId);
  if (!row) {
    const e: any = new Error('Payment not found.');
    e.status = 404;
    throw e;
  }
  const from = normalizeLegacyStatus(row.payment_status);
  const target = normalizeLegacyStatus(to);
  if (from !== target) assertTransition(from, target);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { payment_status: target, updated_at: now };
  if (['VERIFIED', 'CONFIRMED'].includes(target) && !row.verified_at) {
    patch.verified_at = now;
    if (opts.admin) patch.verified_by = opts.admin;
  }
  if (opts.admin && (target === 'REJECTED' || target === 'FRAUD_BLOCKED')) patch.verified_by = opts.admin;
  if (opts.note) patch.admin_notes = opts.note;
  const keys = Object.keys(patch);
  db().prepare(`UPDATE payments SET ${keys.map((k) => `${k}=?`).join(', ')} WHERE id=?`)
    .run(...keys.map((k) => patch[k]), paymentId);
  audit(opts.event || 'PAYMENT_STATUS_CHANGED', opts.admin || '', row.registration_id, `${from} -> ${target}`);
  return { from, to: target };
}
