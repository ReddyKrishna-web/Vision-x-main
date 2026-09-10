import crypto from 'node:crypto';
import type { RazorpayVerifyResult } from './types';

// Razorpay integration over the official REST API (no SDK dependency).
// Docs: https://razorpay.com/docs/api/orders/ , https://razorpay.com/docs/payments/
// Secrets live here (server-only). The browser only ever sees the public Key ID.

const API_BASE = 'https://api.razorpay.com/v1';

function keyId(): string {
  return process.env.RAZORPAY_KEY_ID || '';
}

function keySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || '';
}

function webhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || '';
}

export function razorpayConfigured(): boolean {
  return !!(keyId() && keySecret());
}

export function razorpayKeyId(): string {
  return keyId();
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64');
}

function configError(): Error {
  const e: any = new Error('Online payment is not configured yet. Please try again later or contact the organisers.');
  e.status = 503;
  e.log = 'RAZORPAY_KEYS_MISSING';
  return e;
}

export interface CreateRazorpayOrderInput {
  registrationId: string;
  amountRupees: number; // authoritative server-side fee
  teamName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt: string;
  status: string;
}

// Server-side order creation. Amount comes from the server fee, never the browser.
export async function createRazorpayOrder(input: CreateRazorpayOrderInput): Promise<RazorpayOrder> {
  if (!razorpayConfigured()) throw configError();
  const amountPaise = Math.round(Number(input.amountRupees) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    const e: any = new Error('Invalid payable amount.');
    e.status = 500;
    throw e;
  }
  const receipt = String(input.registrationId).slice(0, 40);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { registration_id: input.registrationId, team_name: String(input.teamName || '').slice(0, 100) },
      }),
    });
  } catch {
    const e: any = new Error('Could not reach the payment gateway. Please check your connection and try again.');
    e.status = 502;
    e.log = 'RAZORPAY_ORDER_NETWORK_ERROR';
    throw e;
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    const e: any = new Error('Payment order could not be created. Please try again.');
    e.status = 502;
    e.log = `RAZORPAY_ORDER_FAILED: ${String(data?.error?.description || data?.error?.code || res.status).slice(0, 200)}`;
    throw e;
  }
  return { id: String(data.id), amount: Number(data.amount), currency: String(data.currency || 'INR'), receipt: String(data.receipt || receipt), status: String(data.status || '') };
}

// Fetch a payment from Razorpay — server-side truth for verification.
export async function fetchRazorpayPayment(paymentId: string): Promise<any> {
  if (!razorpayConfigured()) throw configError();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authHeader() },
    });
  } catch {
    const e: any = new Error('Payment verification hit a snag. Please try again.');
    e.status = 502;
    e.log = 'RAZORPAY_FETCH_NETWORK_ERROR';
    throw e;
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error('Payment verification hit a snag. Please try again.');
    e.status = 502;
    e.log = `RAZORPAY_FETCH_FAILED: ${res.status}`;
    throw e;
  }
  return data;
}

// Cryptographic checkout verification: HMAC-SHA256(order_id|payment_id) with key secret.
// This — not any browser claim — decides whether money actually moved.
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const secret = keySecret();
    if (!secret || !orderId || !paymentId || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`, 'utf8').digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Webhook authenticity: HMAC-SHA256(rawBody, webhook_secret), hex digest.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  try {
    const secret = webhookSecret();
    if (!secret || !signature || !rawBody) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Full server-side verification for one captured checkout response:
// 1. signature must be cryptographically valid
// 2. order must match our internal payment record
// 3. Razorpay's own API must report the payment captured for that order + amount
export async function serverVerifyRazorpayCheckout(opts: {
  expectedOrderId: string;
  expectedAmountPaise: number;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<RazorpayVerifyResult> {
  if (!razorpayConfigured()) throw configError();
  if (opts.orderId !== opts.expectedOrderId) {
    return { verified: false, gatewayStatus: 'ORDER_MISMATCH' };
  }
  if (!verifyCheckoutSignature(opts.orderId, opts.paymentId, opts.signature)) {
    return { verified: false, gatewayStatus: 'BAD_SIGNATURE' };
  }
  const payment: any = await fetchRazorpayPayment(opts.paymentId);
  const status = String(payment?.status || '').toLowerCase();
  const paidOrderId = String(payment?.order_id || '');
  const paidAmount = Number(payment?.amount || 0);
  if (paidOrderId !== opts.expectedOrderId) {
    return { verified: false, gatewayStatus: 'ORDER_MISMATCH', providerPaymentId: opts.paymentId };
  }
  if (paidAmount !== opts.expectedAmountPaise) {
    return { verified: false, gatewayStatus: 'AMOUNT_MISMATCH', providerPaymentId: opts.paymentId };
  }
  if (status === 'captured') {
    return { verified: true, gatewayStatus: 'captured', providerPaymentId: opts.paymentId, amount: paidAmount / 100 };
  }
  if (status === 'failed') {
    return { verified: false, gatewayStatus: 'failed', providerPaymentId: opts.paymentId };
  }
  return { verified: false, gatewayStatus: status || 'pending', providerPaymentId: opts.paymentId };
}
