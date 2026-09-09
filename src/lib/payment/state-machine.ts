import type { PaymentStatus } from './types';

// Centralized payment state machine — all transitions must go through canTransition/transition.
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ['PENDING', 'EXPIRED', 'CANCELLED'],
  PENDING: ['PROCESSING', 'VERIFYING', 'FAILED', 'EXPIRED', 'CANCELLED', 'REVIEW_REQUIRED', 'DUPLICATE'],
  PROCESSING: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PAID: ['VERIFYING', 'FAILED'],
  VERIFYING: ['VERIFIED', 'FAILED', 'REVIEW_REQUIRED', 'FRAUD_BLOCKED', 'DUPLICATE'],
  VERIFIED: ['CONFIRMED', 'REJECTED', 'REVIEW_REQUIRED', 'FRAUD_BLOCKED'],
  CONFIRMED: ['REJECTED', 'DUPLICATE'], // post-confirm admin correction only
  REVIEW_REQUIRED: ['VERIFIED', 'REJECTED', 'CONFIRMED', 'FRAUD_BLOCKED', 'DUPLICATE', 'FAILED'],
  FAILED: ['PENDING', 'EXPIRED'], // safe retry: failed -> pending (new attempt)
  CANCELLED: ['PENDING'], // user retry
  EXPIRED: ['PENDING'], // retry after timeout
  REJECTED: ['PENDING'], // admin allows resubmission path via new attempt
  DUPLICATE: ['REJECTED', 'CONFIRMED'],
  FRAUD_BLOCKED: ['REJECTED', 'CONFIRMED'], // explicit admin override only
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: PaymentStatus, to: PaymentStatus) {
  if (!canTransition(from, to)) {
    const e: any = new Error(`Invalid payment transition ${from} -> ${to}`);
    e.status = 409;
    throw e;
  }
}

// Legacy statuses from v1 (PENDING, OCR_DETECTED, MANUAL_REVIEW, VERIFIED, REJECTED, DUPLICATE)
// map into the new machine so old rows remain valid.
export function normalizeLegacyStatus(s: string): PaymentStatus {
  const v = String(s || 'PENDING').toUpperCase();
  if (v === 'OCR_DETECTED' || v === 'MANUAL_REVIEW') return 'REVIEW_REQUIRED';
  const known: PaymentStatus[] = ['CREATED','PENDING','PROCESSING','PAID','VERIFYING','VERIFIED','CONFIRMED','REVIEW_REQUIRED','FAILED','CANCELLED','EXPIRED','REJECTED','DUPLICATE','FRAUD_BLOCKED'];
  return (known as string[]).includes(v) ? (v as PaymentStatus) : 'PENDING';
}

// Whether this payment state means the registration counts as finalized/confirmed.
export function isFinalizedPaymentStatus(s: string): boolean {
  return s === 'CONFIRMED' || s === 'VERIFIED';
}
