import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { currentTeam } from '@/lib/team-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Team QR code: contains ONLY a public verification URL (team name + status
// are looked up server-side). Never any password, hash, or credential.
export async function GET(req: NextRequest) {
  try {
    const t = await currentTeam();
    if (!t) return NextResponse.json({ error: 'Please log in to view your dashboard.' }, { status: 401 });
    const origin = new URL(req.url).origin;
    const verifyUrl = `${origin}/verify?id=${encodeURIComponent(t.registrationId)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 512, margin: 1 });
    return NextResponse.json({ verifyUrl, qrDataUrl });
  } catch {
    return NextResponse.json({ error: 'Could not generate the QR code. Please try again.' }, { status: 500 });
  }
}
