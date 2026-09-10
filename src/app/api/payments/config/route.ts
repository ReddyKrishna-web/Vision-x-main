import { NextResponse } from 'next/server';
import { razorpayConfigured, razorpayKeyId } from '@/lib/payment/razorpay';
import { getSettings } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public payment configuration — safe fields only. The Key SECRET is never exposed.
export async function GET() {
  const s = getSettings();
  const configured = razorpayConfigured();
  return NextResponse.json({
    provider: 'razorpay',
    configured,
    keyId: configured ? razorpayKeyId() : '',
    fee: s.registration_fee || 0,
    currency: 'INR',
  });
}
