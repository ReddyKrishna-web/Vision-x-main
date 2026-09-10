import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { qrImageFile } from '@/lib/payment/upi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public: serves the currently active admin-configured UPI QR image.
// Nothing sensitive — the QR is meant to be scanned by every payer.
export async function GET() {
  const f = qrImageFile();
  if (!f) return NextResponse.json({ error: 'UPI QR is not available yet. Please try again later.' }, { status: 404 });
  try {
    const buf = fs.readFileSync(f);
    const type = f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return new NextResponse(buf, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return NextResponse.json({ error: 'UPI QR is not available yet. Please try again later.' }, { status: 404 });
  }
}
