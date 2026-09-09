import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db } from '@/lib/db';
import { serverVerifyPayment } from '@/lib/payment/verification';
import { setPaymentStatus } from '@/lib/payment/payment-router';
import { finalizeVerifiedPayment } from '@/lib/payment/finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  registrationId: z.string().min(3).max(32),
  paymentId: z.number().int().optional(),
  razorpay_order_id: z.string().min(3).max(64),
  razorpay_payment_id: z.string().min(3).max(64),
  razorpay_signature: z.string().min(10).max(256),
  clientClaimedSuccess: z.boolean().optional(),
});

// Client calls this with the Razorpay Checkout response. The server — and only
// the server — decides truth: HMAC signature check + Razorpay API re-fetch.
// Browser claims are untrusted input and never authority.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment response. Please retry payment.' }, { status: 400 });
    const { registrationId } = parsed.data;

    const pay: any = parsed.data.paymentId
      ? db().prepare('SELECT * FROM payments WHERE id=?').get(parsed.data.paymentId)
      : db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1').get(registrationId);
    if (!pay || pay.registration_id !== registrationId) {
      return NextResponse.json({ error: 'Payment not found for this registration.' }, { status: 404 });
    }

    // Idempotent: already-finalized payments return current status (user refresh / double submit).
    if (['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status))) {
      return NextResponse.json({ status: String(pay.payment_status), registrationId, duplicate: true });
    }

    // Duplicate delivery guard: this Razorpay payment already settled a (any) registration.
    const settled: any = db().prepare(
      `SELECT registration_id FROM payments WHERE provider_payment_id=? AND provider_payment_id!='' AND payment_status IN ('VERIFIED','CONFIRMED') LIMIT 1`,
    ).get(parsed.data.razorpay_payment_id);
    if (settled && settled.registration_id !== registrationId) {
      try {
        db().prepare(`INSERT INTO fraud_events (registration_id,payment_id,rule_id,severity,points,evidence,event_type) VALUES (?,?,?,?,?,?,?)`)
          .run(registrationId, pay.id, 'DUPLICATE_PROVIDER_PAYMENT', 'critical', 45, `payment ${parsed.data.razorpay_payment_id} already settled for ${settled.registration_id}`, 'PAYMENT_FAILED');
      } catch {}
      try { setPaymentStatus(pay.id, 'REVIEW_REQUIRED', { event: 'PAYMENT_DUPLICATE_DELIVERY' }); } catch {}
      return NextResponse.json({ status: 'REVIEW_REQUIRED', registrationId });
    }

    try { setPaymentStatus(pay.id, 'VERIFYING', { event: 'PAYMENT_VERIFYING' }); } catch {}

    let result: any;
    try {
      result = await serverVerifyPayment(pay.id, {
        orderId: parsed.data.razorpay_order_id,
        paymentId: parsed.data.razorpay_payment_id,
        signature: parsed.data.razorpay_signature,
      });
    } catch (e: any) {
      const status = e?.status;
      // Config / upstream errors: keep the attempt retryable, never mark paid.
      if (status === 503 || status === 502) {
        try { setPaymentStatus(pay.id, 'PENDING', { event: 'PAYMENT_VERIFY_RETRYABLE' }); } catch {}
        return NextResponse.json({ error: e?.message || 'Verification hit a snag. Please try again.', status: 'PENDING', registrationId }, { status });
      }
      try { setPaymentStatus(pay.id, 'FAILED', { event: 'PAYMENT_FAILED' }); } catch {}
      try {
        db().prepare(`INSERT INTO fraud_events (registration_id,payment_id,rule_id,severity,points,evidence,event_type) VALUES (?,?,?,?,?,?,?)`)
          .run(registrationId, pay.id, 'INVALID_GATEWAY_VERIFY', 'high', 30, String(result?.gatewayStatus || e?.message || 'verify error').slice(0, 200), 'PAYMENT_FAILED');
      } catch {}
      return NextResponse.json({ error: 'Payment verification failed. No money was confirmed — you can safely retry.', status: 'FAILED', registrationId }, { status: 402 });
    }

    if (!result.verified) {
      const gw = String(result.gatewayStatus || '').toUpperCase();
      if (['PENDING', 'AUTHORIZED', 'CREATED'].includes(gw)) {
        try { setPaymentStatus(pay.id, 'PENDING', { event: 'PAYMENT_PENDING' }); } catch {}
        return NextResponse.json({ status: 'PENDING', registrationId, gatewayStatus: result.gatewayStatus });
      }
      try { setPaymentStatus(pay.id, 'FAILED', { event: 'PAYMENT_FAILED' }); } catch {}
      audit('PAYMENT_FAILED', '', registrationId, `gateway=${result.gatewayStatus}`);
      return NextResponse.json({ status: 'FAILED', registrationId, gatewayStatus: result.gatewayStatus });
    }

    // Authenticated by Razorpay -> shared fraud screen -> confirm / review / block.
    const done = finalizeVerifiedPayment(pay.id, {
      source: 'checkout',
      clientClaimedSuccess: !!parsed.data.clientClaimedSuccess,
      ip: req.headers.get('x-forwarded-for') || '',
    });
    audit('PAYMENT_VERIFIED', '', registrationId, `razorpay payment=${result.providerPaymentId}`);
    return NextResponse.json(done);
  } catch (e: any) {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: e?.status || 500 });
  }
}
