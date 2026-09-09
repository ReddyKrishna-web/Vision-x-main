import { NextRequest, NextResponse } from 'next/server';
import { audit, db } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payment/razorpay';
import { setPaymentStatus } from '@/lib/payment/payment-router';
import { finalizeVerifiedPayment } from '@/lib/payment/finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Razorpay webhook: POST /api/payments/webhook/razorpay
// Verifies HMAC-SHA256 signature, enforces idempotency via webhook_events,
// then confirms through the same server-side decision as checkout verify.
// Docs: https://razorpay.com/docs/webhooks/
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') || '';
  let body: any = {};
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }

  const event = String(body?.event || '');
  const eventId = String(body?.id || `${event}:${body?.payload?.payment?.entity?.id || ''}:${body?.created_at || Date.now()}`);
  const paymentEntity: any = body?.payload?.payment?.entity || body?.payload?.order?.entity || {};
  const razorpayPaymentId = String(paymentEntity?.id || '');
  const razorpayOrderId = String(paymentEntity?.order_id || '');

  if (!verifyWebhookSignature(raw, sig)) {
    try {
      db().prepare(`INSERT INTO fraud_events (registration_id,rule_id,severity,points,evidence,event_type) VALUES (?,?,?,?,?,?)`)
        .run('', 'INVALID_WEBHOOK', 'high', 30, `event=${event} order=${razorpayOrderId}`, 'WEBHOOK_INVALID');
    } catch {}
    audit('WEBHOOK_INVALID', '', '', `razorpay event=${event}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Idempotency: repeated deliveries must not double-process.
  try {
    db().prepare(`INSERT INTO webhook_events (provider,event_id,payload,verified) VALUES (?,?,?,?)`)
      .run('razorpay', eventId, raw.slice(0, 4000), 1);
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  audit('WEBHOOK_VERIFIED', '', '', `razorpay event=${event} order=${razorpayOrderId}`);

  // Only payment success/failure events change state; everything else is acked.
  if (event !== 'payment.captured' && event !== 'payment.failed') {
    return NextResponse.json({ ok: true });
  }
  if (!razorpayOrderId) return NextResponse.json({ ok: true });

  const pay: any = db().prepare('SELECT * FROM payments WHERE provider_order_id=? ORDER BY id DESC LIMIT 1').get(razorpayOrderId);
  if (!pay) return NextResponse.json({ ok: true });

  // Already settled: ack without side effects (prevents double Excel rows / double confirm).
  if (['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event === 'payment.failed') {
    try { setPaymentStatus(pay.id, 'FAILED', { event: 'PAYMENT_FAILED' }); } catch {}
    audit('PAYMENT_FAILED', '', pay.registration_id, `razorpay webhook payment=${razorpayPaymentId}`);
    return NextResponse.json({ ok: true });
  }

  // payment.captured: record gateway truth, then run the shared decision.
  const now = new Date().toISOString();
  db().prepare(`UPDATE payments SET provider_payment_id=COALESCE(NULLIF(provider_payment_id,''), ?), gateway_status='captured', verification_status='PENDING', webhook_verified=1, webhook_event_id=?, updated_at=? WHERE id=?`)
    .run(razorpayPaymentId, eventId, now, pay.id);
  try { setPaymentStatus(pay.id, 'VERIFYING', { event: 'PAYMENT_VERIFYING' }); } catch {}
  // Re-fetch authoritative status inside finalize? The captured event + valid HMAC
  // is Razorpay's own signed statement; finalize runs fraud screen + confirmation.
  const done = finalizeVerifiedPayment(pay.id, { source: 'webhook', ip: req.headers.get('x-forwarded-for') || '' });
  if (done.status === 'CONFIRMED') {
    db().prepare(`UPDATE payments SET verification_status='VERIFIED', updated_at=? WHERE id=?`).run(new Date().toISOString(), pay.id);
  }
  return NextResponse.json({ ok: true, status: done.status });
}
