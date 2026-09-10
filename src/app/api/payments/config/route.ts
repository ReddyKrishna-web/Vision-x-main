import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { upiId, upiPaymentsConfigured } from '@/lib/payment/upi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public payment configuration — safe fields only. The UPI ID and QR image
// are display data by design (payers need them); there are no secrets here.
export async function GET() {
  const s = getSettings();
  const configured = upiPaymentsConfigured();
  return NextResponse.json({
    provider: 'upi_manual',
    configured,
    upiId: configured ? upiId() : '',
    qrImageUrl: '/api/payment-qr',
    fee: s.registration_fee || 0,
    currency: 'INR',
  });
}
