import { db, audit } from '@/lib/db';
import { RULES } from './rules';
import { findDuplicates, findRollReuse } from './duplicate';
import { velocitySignals, failedAttempts } from './velocity';
import { txnFormatValid } from './identifier-analysis';
import { actionForLevel, levelForScore, type FraudAssessment, type FraudReason } from './types';

export interface AssessInput {
  registrationId: string;
  paymentId?: number;
  providerPaymentId?: string;
  transactionId?: string;
  paymentReference?: string;
  screenshotHash?: string;
  screenshotAvgHash?: string;
  amount?: number;
  expectedAmount?: number;
  gatewayOk?: boolean | null; // true=verified, false=failed, null=not-applicable (manual)
  webhookOk?: boolean | null;
  clientClaimedSuccess?: boolean;
  ocr?: { txn?: string; amount?: string; status?: string; confidence?: number };
  userUtr?: string;
  memberRolls?: string[];
  email?: string;
  phone?: string;
  ip?: string;
}

function reason(ruleId: string, ctx = ''): FraudReason {
  const r = RULES[ruleId];
  return { ruleId, points: r.points, severity: r.severity, evidence: r.describe(ctx), at: new Date().toISOString() };
}

// Main entry: computes deterministic score, persists fraud_events + payment risk fields.
export function assessPaymentRisk(input: AssessInput): FraudAssessment {
  const reasons: FraudReason[] = [];

  const dups = findDuplicates({
    providerPaymentId: input.providerPaymentId,
    transactionId: input.transactionId || input.ocr?.txn,
    paymentReference: input.paymentReference,
    screenshotHash: input.screenshotHash,
    excludeRegistrationId: input.registrationId,
  });
  for (const d of dups) {
    if (d.kind === 'provider_payment') reasons.push(reason('DUPLICATE_PROVIDER_PAYMENT', d.detail));
    else if (d.kind === 'transaction') reasons.push(reason('DUPLICATE_TRANSACTION', d.detail));
    else if (d.kind === 'reference') reasons.push(reason('DUPLICATE_REFERENCE', d.detail));
    else if (d.kind === 'screenshot') reasons.push(reason('DUPLICATE_SCREENSHOT', d.detail));
  }

  // OCR-specific checks (evidence only — OCR never proves payment).
  const ocr = input.ocr;
  if (ocr) {
    if (ocr.txn && !txnFormatValid(ocr.txn)) reasons.push(reason('OCR_TRANSACTION_FORMAT_INVALID', ocr.txn));
    if ((ocr.confidence ?? 1) < 0.4) reasons.push(reason('LOW_OCR_CONFIDENCE'));
    if (ocr.status && !/SUCCESS/i.test(ocr.status)) reasons.push(reason('OCR_STATUS_NOT_SUCCESS', ocr.status));
    if (ocr.amount && input.expectedAmount) {
      const a = Number(String(ocr.amount).replace(/[^0-9.]/g, ''));
      if (a && Math.abs(a - input.expectedAmount) > 0.5) reasons.push(reason('OCR_AMOUNT_MISMATCH', `${a} vs ${input.expectedAmount}`));
    }
    if (input.userUtr && ocr.txn && input.userUtr.toUpperCase() !== ocr.txn.toUpperCase()) {
      reasons.push(reason('USER_UTR_MISMATCH'));
    }
  }

  if (input.amount != null && input.expectedAmount != null && Math.abs(input.amount - input.expectedAmount) > 0.5) {
    reasons.push(reason('AMOUNT_MISMATCH', `${input.amount} vs ${input.expectedAmount}`));
  }
  if (input.gatewayOk === false) reasons.push(reason('INVALID_GATEWAY_VERIFY'));
  if (input.webhookOk === false) reasons.push(reason('INVALID_WEBHOOK'));
  if (input.clientClaimedSuccess && input.gatewayOk === false) reasons.push(reason('CLIENT_PROVIDER_MISMATCH'));

  if (input.email || input.phone) {
    const fails = failedAttempts(input.email || input.phone || '');
    if (fails >= 3) reasons.push(reason('REPEATED_FAILURES', `${fails} in 24h`));
  }
  if (input.memberRolls?.length) {
    const reuse = findRollReuse(input.memberRolls, input.registrationId);
    for (const r of reuse.slice(0, 3)) reasons.push(reason('ROLL_REUSE', r.detail));
  }
  const vel = velocitySignals({ email: input.email, phone: input.phone, ip: input.ip });
  if (vel.count1h >= 20 || vel.sameIp1h >= 5) {
    reasons.push(reason('VELOCITY_BURST', `${vel.count1h}/h global, ${vel.sameIp1h}/h ip`));
  }

  let score = reasons.reduce((a, r) => a + r.points, 0);
  score = Math.max(0, Math.min(100, score)); // never exceed 100
  const level = levelForScore(score);

  // Persist events + roll up onto payment row.
  try {
    for (const r of reasons) {
      db().prepare(
        `INSERT INTO fraud_events (registration_id, payment_id, rule_id, severity, points, evidence) VALUES (?,?,?,?,?,?)`,
      ).run(input.registrationId, input.paymentId ?? null, r.ruleId, r.severity, r.points, r.evidence);
    }
    if (input.paymentId) {
      const autoBlock = Number(process.env.FRAUD_BLOCK_MIN_RISK || 80);
      const reviewMin = Number(process.env.FRAUD_REVIEW_MIN_RISK || 60);
      const fraudStatus = score >= autoBlock ? 'BLOCKED' : score >= reviewMin ? 'REVIEW' : score >= 30 ? 'MONITOR' : 'CLEAR';
      db().prepare(
        `UPDATE payments SET fraud_risk_score=?, fraud_risk_level=?, fraud_status=?, risk_reasons=?, updated_at=? WHERE id=?`,
      ).run(score, level, fraudStatus, JSON.stringify(reasons), new Date().toISOString(), input.paymentId);
    }
    audit('FRAUD_RISK_UPDATED', '', input.registrationId, `score=${score} level=${level}`);
  } catch { /* fraud tables missing pre-migration — scoring still returned */ }

  return { score, level, reasons, recommendedAction: actionForLevel(level) };
}
