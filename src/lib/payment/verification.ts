import { db } from '@/lib/db';
import { serverVerifyRazorpayCheckout } from './razorpay';

// Server-side verification: the ONLY authority for Razorpay payments.
// Client checkout responses are untrusted input; this function decides truth
// by checking the HMAC signature AND re-fetching the payment from Razorpay.
export async function serverVerifyPayment(paymentId: number, opts: { orderId?: string; paymentId?: string; signature?: string } = {}) {
  const row: any = db().prepare('SELECT * FROM payments WHERE id=?').get(paymentId);
  if (!row) {
    const e: any = new Error('Payment not found.');
    e.status = 404;
    throw e;
  }
  const expectedOrderId = String(row.provider_order_id || '');
  if (!expectedOrderId) {
    const e: any = new Error('No Razorpay order linked to this payment.');
    e.status = 409;
    throw e;
  }
  if (!opts.orderId || !opts.paymentId || !opts.signature) {
    const e: any = new Error('Incomplete payment response. Please retry payment.');
    e.status = 400;
    throw e;
  }
  const expectedAmountPaise = Math.round(Number(row.amount || 0) * 100);
  const result = await serverVerifyRazorpayCheckout({
    expectedOrderId,
    expectedAmountPaise,
    orderId: String(opts.orderId),
    paymentId: String(opts.paymentId),
    signature: String(opts.signature),
  });
  const now = new Date().toISOString();
  db().prepare(
    'UPDATE payments SET gateway_status=?, provider_payment_id=COALESCE(NULLIF(provider_payment_id,\'\'), ?), verification_status=?, updated_at=? WHERE id=?',
  ).run(
    result.gatewayStatus || '',
    result.providerPaymentId || row.provider_payment_id || '',
    result.verified ? 'VERIFIED' : 'PENDING',
    now,
    paymentId,
  );
  return result;
}
