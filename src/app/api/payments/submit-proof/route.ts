import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { audit, db, UPLOAD_DIR_PATH } from '@/lib/db';
import { normTxn } from '@/lib/validators';
import { parseImageDataUrl } from '@/lib/payment/upi';
import { setPaymentStatus } from '@/lib/payment/payment-router';
import { assessPaymentRisk } from '@/lib/fraud';
import { triggerSync } from '@/lib/excel/sync-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// UTR is typically the 12-digit UPI reference; accept 6-32 alphanumerics
// to tolerate bank variations without accepting obvious junk.
const UTR_RE = /^[A-Z0-9]{6,32}$/;
const SCREENSHOT_MAX_BYTES = Math.round(2.5 * 1024 * 1024);

const schema = z.object({
  registrationId: z.string().trim().min(3).max(32),
  utr: z.string().trim().min(1).max(64),
  // Optional `data:image/png|jpeg;base64,…` payment screenshot.
  screenshot: z.string().max(4 * 1024 * 1024).optional(),
});

const hits: number[] = [];
function rateLimit(): boolean {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60000) hits.shift();
  if (hits.length >= 30) return false;
  hits.push(now);
  return true;
}

// Submit manual-UPI payment proof: UTR reference (+ optional screenshot).
// This records a payment CLAIM — it never auto-confirms. The payment moves
// to REVIEW_REQUIRED and an admin VERIFYs/REJECTs it from /admin/payments.
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit()) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please complete the payment proof.' }, { status: 400 });
    }
    const regId = parsed.data.registrationId.trim();
    const utr = normTxn(parsed.data.utr);
    if (!UTR_RE.test(utr)) {
      return NextResponse.json({ error: 'Enter the valid UPI transaction reference (UTR / UPI Ref No.) from your payment app.' }, { status: 400 });
    }
    const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(regId);
    if (!reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    const pay: any = db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1').get(regId);
    if (!pay) return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    if (pay.payment_status === 'CONFIRMED' || pay.payment_status === 'VERIFIED') {
      return NextResponse.json({ status: pay.payment_status, registrationId: regId, duplicate: true });
    }

    // Same UTR claimed for another team: refuse, don't silently merge.
    const dup: any = db().prepare(
      `SELECT registration_id FROM payments WHERE (transaction_id=? OR manual_txn=?) AND registration_id<>? LIMIT 1`,
    ).get(utr, utr, regId);
    if (dup) {
      return NextResponse.json({ error: 'This transaction reference was already submitted for another registration. Please check the UTR and try again.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    let shotName = '';
    if (parsed.data.screenshot) {
      let img;
      try {
        img = parseImageDataUrl(parsed.data.screenshot, SCREENSHOT_MAX_BYTES);
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Invalid screenshot image.' }, { status: e?.status || 400 });
      }
      const safeReg = regId.replace(/[^A-Za-z0-9\-]/g, '').slice(0, 24) || 'reg';
      shotName = `payshot-${safeReg}-${Date.now()}.${img.ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR_PATH, shotName), img.buf);
    }

    db().prepare(
      `UPDATE payments SET transaction_id=?, manual_txn=?, payment_reference=?, screenshot_path=COALESCE(NULLIF(?, ''), screenshot_path), verification_status='PENDING', updated_at=? WHERE id=?`,
    ).run(utr, utr, utr, shotName, now, pay.id);

    // Re-open terminal non-final states so a corrected proof can be reviewed.
    const cur = String(pay.payment_status || 'PENDING');
    if (['FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(cur)) {
      try { setPaymentStatus(pay.id, 'PENDING', { event: 'PAYMENT_PROOF_REOPENED' }); } catch {}
    }
    setPaymentStatus(pay.id, 'REVIEW_REQUIRED', { event: 'PAYMENT_PROOF_SUBMITTED' });
    db().prepare(`UPDATE registrations SET registration_status='UNDER_REVIEW', updated_at=? WHERE registration_id=?`).run(now, regId);

    try {
      assessPaymentRisk({
        registrationId: regId, paymentId: pay.id, transactionId: utr,
        amount: pay.amount, expectedAmount: pay.amount,
        email: reg.leader_email, phone: reg.leader_phone,
        ip: req.headers.get('x-forwarded-for') || '',
      });
    } catch { /* proof is recorded regardless */ }

    audit('PAYMENT_PROOF_SUBMITTED', '', regId, `utr=${utr}${shotName ? ' +screenshot' : ''}`);
    try { triggerSync(regId); } catch {}
    return NextResponse.json({ status: 'REVIEW_REQUIRED', registrationId: regId });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not submit payment proof. Please try again.' }, { status: e?.status || 500 });
  }
}
