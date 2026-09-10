import { audit, db, getSettings } from '@/lib/db';
import { normalizeLegacyStatus } from './state-machine';
import { setPaymentStatus } from './payment-router';
import { assessPaymentRisk } from '@/lib/fraud';
import { triggerSync } from '@/lib/excel/sync-engine';

// Shared post-verification decision used by BOTH the verify endpoint and the
// webhook: gateway-authenticated payment -> fraud/risk screen -> exactly one
// of CONFIRMED / REVIEW_REQUIRED / FRAUD_BLOCKED. Idempotent: finalized
// payments are returned as-is so retries and duplicate deliveries are safe.
export function finalizeVerifiedPayment(
  paymentId: number,
  ctx: { source: 'checkout' | 'webhook'; clientClaimedSuccess?: boolean; ip?: string },
): { status: string; registrationId: string; riskScore: number; duplicate?: boolean } {
  const pay: any = db().prepare('SELECT * FROM payments WHERE id=?').get(paymentId);
  if (!pay) {
    const e: any = new Error('Payment not found.');
    e.status = 404;
    throw e;
  }
  const registrationId = String(pay.registration_id || '');
  if (['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status))) {
    return { status: String(pay.payment_status), registrationId, riskScore: Number(pay.fraud_risk_score || 0), duplicate: true };
  }
  const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(registrationId);
  if (!reg) {
    const e: any = new Error('Registration not found.');
    e.status = 404;
    throw e;
  }
  // Drive the state machine onto a legal path first: retries may arrive while a
  // previous attempt sits at FAILED / CANCELLED / EXPIRED / CREATED. The legal
  // retry chain is ... -> PENDING -> VERIFYING -> VERIFIED.
  let cur = normalizeLegacyStatus(String(pay.payment_status));
  if (['CREATED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(cur)) {
    setPaymentStatus(paymentId, 'PENDING', { event: 'PAYMENT_REOPEN' });
    cur = 'PENDING';
  }
  if (cur === 'PENDING') {
    try { setPaymentStatus(paymentId, 'VERIFYING', { event: 'PAYMENT_VERIFYING' }); } catch {}
  }
  const s = getSettings();
  const members: any[] = (() => {
    try { return db().prepare('SELECT roll_number FROM team_members WHERE registration_id=?').all(registrationId) as any[]; }
    catch { return []; }
  })();
  const assessment = assessPaymentRisk({
    registrationId,
    paymentId: pay.id,
    providerPaymentId: pay.provider_payment_id || undefined,
    transactionId: pay.transaction_id || undefined,
    paymentReference: pay.payment_reference || undefined,
    screenshotHash: pay.screenshot_hash || undefined,
    amount: Number(pay.amount || 0),
    expectedAmount: Number(s.registration_fee || pay.amount || 0),
    gatewayOk: true,
    webhookOk: ctx.source === 'webhook' ? true : undefined,
    clientClaimedSuccess: ctx.source === 'checkout' ? !!ctx.clientClaimedSuccess : undefined,
    memberRolls: members.map((m) => String(m.roll_number || '')),
    email: reg.leader_email,
    phone: reg.leader_phone,
    ip: ctx.ip || '',
  });
  const now = new Date().toISOString();
  if (assessment.score >= Number(process.env.FRAUD_BLOCK_MIN_RISK || 80)) {
    setPaymentStatus(pay.id, 'FRAUD_BLOCKED', { event: 'PAYMENT_FRAUD_BLOCKED' });
    db().prepare(`UPDATE registrations SET registration_status='FRAUD_HOLD', updated_at=? WHERE registration_id=?`).run(now, registrationId);
    return { status: 'FRAUD_BLOCKED', registrationId, riskScore: assessment.score };
  }
  if (assessment.score >= Number(process.env.FRAUD_REVIEW_MIN_RISK || 60)) {
    setPaymentStatus(pay.id, 'REVIEW_REQUIRED', { event: 'PAYMENT_REVIEW' });
    db().prepare(`UPDATE registrations SET registration_status='UNDER_REVIEW', updated_at=? WHERE registration_id=?`).run(now, registrationId);
    triggerSync(registrationId);
    return { status: 'REVIEW_REQUIRED', registrationId, riskScore: assessment.score };
  }
  setPaymentStatus(pay.id, 'VERIFIED', { event: 'PAYMENT_VERIFIED' });
  setPaymentStatus(pay.id, 'CONFIRMED', { event: 'PAYMENT_CONFIRMED' });
  db().prepare(`UPDATE registrations SET registration_status='CONFIRMED', confirmed_at=COALESCE(NULLIF(confirmed_at,''), ?), updated_at=? WHERE registration_id=?`).run(now, now, registrationId);
  audit('REGISTRATION_FINALIZED', '', registrationId, `razorpay verified via ${ctx.source}`);
  triggerSync(registrationId);
  return { status: 'CONFIRMED', registrationId, riskScore: assessment.score };
}
