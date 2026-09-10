import { db } from '@/lib/db';

// Duplicate signals across provider payment IDs, txns/UTRs, references, screenshot hashes.
export interface DuplicateHit {
  kind: 'provider_payment' | 'transaction' | 'reference' | 'screenshot' | 'roll' | 'member_combo';
  registrationId: string;
  detail: string;
}

export function findDuplicates(input: {
  providerPaymentId?: string;
  transactionId?: string;
  paymentReference?: string;
  screenshotHash?: string;
  excludeRegistrationId?: string;
}): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  const q = (sql: string, v: string, kind: DuplicateHit['kind'], label: string) => {
    if (!v) return;
    const rows: any[] = db().prepare(sql).all(v, input.excludeRegistrationId || '');
    for (const r of rows) hits.push({ kind, registrationId: r.registration_id, detail: `${label}: ${v}` });
  };
  q(
    `SELECT registration_id FROM payments WHERE provider_payment_id=? AND provider_payment_id!='' AND registration_id!=? LIMIT 5`,
    (input.providerPaymentId || '').toUpperCase(), 'provider_payment', 'Duplicate provider payment',
  );
  q(
    `SELECT registration_id FROM payments WHERE transaction_id=? AND transaction_id!='' AND registration_id!=? LIMIT 5`,
    (input.transactionId || '').toUpperCase(), 'transaction', 'Duplicate transaction/UTR',
  );
  q(
    `SELECT registration_id FROM payments WHERE payment_reference=? AND payment_reference!='' AND registration_id!=? LIMIT 5`,
    (input.paymentReference || '').toUpperCase(), 'reference', 'Duplicate payment reference',
  );
  q(
    `SELECT registration_id FROM payments WHERE screenshot_hash=? AND screenshot_hash!='' AND registration_id!=? LIMIT 5`,
    input.screenshotHash || '', 'screenshot', 'Duplicate screenshot',
  );
  return hits;
}

// Same roll number appearing in a DIFFERENT registration (possible multi-team abuse).
export function findRollReuse(rolls: string[], excludeRegistrationId: string): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  for (const roll of rolls) {
    const r = String(roll || '').trim().toLowerCase();
    if (!r) continue;
    const rows: any[] = db().prepare(
      `SELECT registration_id FROM team_members WHERE lower(roll_number)=? AND registration_id!=? LIMIT 5`,
    ).all(r, excludeRegistrationId);
    for (const row of rows) hits.push({ kind: 'roll', registrationId: row.registration_id, detail: `Roll number reused: ${roll}` });
  }
  return hits;
}
