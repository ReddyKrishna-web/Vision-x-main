import type { FraudReason } from './types';

// Deterministic, explainable rule catalogue. Each rule has a fixed ID + max points.
export interface RuleDef {
  id: string;
  points: number;
  severity: FraudReason['severity'];
  describe: (ctx: string) => string;
}

export const RULES: Record<string, RuleDef> = {
  DUPLICATE_PROVIDER_PAYMENT: { id: 'DUPLICATE_PROVIDER_PAYMENT', points: 45, severity: 'critical', describe: (c) => `Provider payment already used (${c})` },
  DUPLICATE_TRANSACTION: { id: 'DUPLICATE_TRANSACTION', points: 40, severity: 'high', describe: (c) => `Transaction/UTR already used (${c})` },
  DUPLICATE_REFERENCE: { id: 'DUPLICATE_REFERENCE', points: 25, severity: 'medium', describe: (c) => `Payment reference reused (${c})` },
  DUPLICATE_SCREENSHOT: { id: 'DUPLICATE_SCREENSHOT', points: 35, severity: 'high', describe: (c) => `Identical payment screenshot reused` },
  SIMILAR_SCREENSHOT: { id: 'SIMILAR_SCREENSHOT', points: 15, severity: 'low', describe: (c) => `Screenshot visually similar to another submission` },
  AMOUNT_MISMATCH: { id: 'AMOUNT_MISMATCH', points: 25, severity: 'medium', describe: (c) => `Paid amount differs from fee (${c})` },
  INVALID_GATEWAY_VERIFY: { id: 'INVALID_GATEWAY_VERIFY', points: 30, severity: 'high', describe: () => `Gateway verification failed` },
  INVALID_WEBHOOK: { id: 'INVALID_WEBHOOK', points: 30, severity: 'high', describe: () => `Webhook signature invalid` },
  CLIENT_PROVIDER_MISMATCH: { id: 'CLIENT_PROVIDER_MISMATCH', points: 30, severity: 'high', describe: () => `Client claimed success but gateway disagrees` },
  REPEATED_FAILURES: { id: 'REPEATED_FAILURES', points: 20, severity: 'medium', describe: (c) => `Repeated payment failures (${c})` },
  MULTI_PAY_ONE_REG: { id: 'MULTI_PAY_ONE_REG', points: 10, severity: 'low', describe: (c) => `Multiple payment attempts for one registration (${c})` },
  ROLL_REUSE: { id: 'ROLL_REUSE', points: 20, severity: 'medium', describe: (c) => `Team member roll number seen in another team (${c})` },
  VELOCITY_BURST: { id: 'VELOCITY_BURST', points: 15, severity: 'low', describe: (c) => `Unusual registration burst (${c})` },
  OCR_TRANSACTION_ID_DUPLICATE: { id: 'OCR_TRANSACTION_ID_DUPLICATE', points: 30, severity: 'high', describe: (c) => `OCR reference already used (${c})` },
  OCR_AMOUNT_MISMATCH: { id: 'OCR_AMOUNT_MISMATCH', points: 20, severity: 'medium', describe: (c) => `OCR amount differs from fee (${c})` },
  OCR_STATUS_NOT_SUCCESS: { id: 'OCR_STATUS_NOT_SUCCESS', points: 15, severity: 'low', describe: (c) => `Screenshot does not show success (${c})` },
  LOW_OCR_CONFIDENCE: { id: 'LOW_OCR_CONFIDENCE', points: 10, severity: 'low', describe: () => `OCR confidence too low to trust` },
  OCR_TRANSACTION_FORMAT_INVALID: { id: 'OCR_TRANSACTION_FORMAT_INVALID', points: 15, severity: 'low', describe: (c) => `Reference format looks invalid (${c})` },
  USER_UTR_MISMATCH: { id: 'USER_UTR_MISMATCH', points: 15, severity: 'low', describe: () => `Typed UTR differs from OCR reading` },
};
