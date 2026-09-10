import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db } from '@/lib/db';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from '@/lib/payment/razorpay';
import { setPaymentStatus } from '@/lib/payment/payment-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ registrationId: z.string().min(3).max(32) });

// Safe retry: creates a FRESH Razorpay order for an existing unpaid registration.
// Already-paid registrations are never charged again (409). Failed/cancelled/
// expired attempts transition back to PENDING with the new order attached.
// The single payments row per registration is reused — no duplicate records.
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const { registrationId } = parsed.data;
    if (!razorpayConfigured()) {
      return NextResponse.json({ error: 'Online payment is not configured yet. Please try again later.' }, { status: 503 });
    }
    const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(registrationId);
    if (!reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    const pay: any = db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1').get(registrationId);
    if (!pay) return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });

    if (['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status))) {
      return NextResponse.json({ error: 'This registration is already paid. No further payment is needed.', status: pay.payment_status }, { status: 409 });
    }
    if (String(reg.registration_status) === 'CONFIRMED') {
      return NextResponse.json({ error: 'This registration is already confirmed.', status: 'CONFIRMED' }, { status: 409 });
    }

    const fee = Number(pay.amount || 0);
    let order;
    try {
      order = await createRazorpayOrder({
        registrationId,
        amountRupees: fee,
        teamName: reg.team_name,
        customerName: reg.leader_name,
        customerEmail: reg.leader_email,
        customerPhone: reg.leader_phone,
      });
    } catch (e: any) {
      if (e?.log) audit('PAYMENT_ORDER_FAILED', '', registrationId, String(e.log).slice(0, 300));
      return NextResponse.json({ error: e?.message || 'Payment session could not be created. Please try again.' }, { status: e?.status || 502 });
    }
    const now = new Date().toISOString();
    db().prepare(`UPDATE payments SET provider='razorpay', provider_order_id=?, provider_session_id=?, payment_reference=?, payment_method='RAZORPAY', gateway_status='', verification_status='UNVERIFIED', updated_at=? WHERE id=?`)
      .run(order.id, order.id, order.id, now, pay.id);
    try { setPaymentStatus(pay.id, 'PENDING', { event: 'PAYMENT_RETRY_ORDER' }); } catch {}
    audit('PAYMENT_RETRY_ORDER', '', registrationId, `order=${order.id}`);
    return NextResponse.json({
      registrationId,
      paymentId: pay.id,
      provider: 'razorpay',
      checkout: {
        provider: 'razorpay',
        orderId: order.id,
        amount: fee,
        amountPaise: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId(),
        registrationId,
        teamName: reg.team_name,
        customerName: reg.leader_name,
        customerEmail: reg.leader_email,
        customerPhone: reg.leader_phone,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not create a payment retry. Please try again.' }, { status: e?.status || 500 });
  }
}
