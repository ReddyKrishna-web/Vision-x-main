import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { qrImageDataUrl, qrImageFile } from '@/lib/payment/upi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public: serves the currently active admin-configured UPI QR image.
// Nothing sensitive — the QR is meant to be scanned by every payer.
// Prefers the DB-backed data URL (works on read-only serverless like Vercel),
// falls back to the disk cache (Docker/Render/VPS).
export async function GET() {
  const dataUrl = qrImageDataUrl();
  if (dataUrl) {
    try {
      const m = /^data:(image\/(png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
      if (m) {
        const buf = Buffer.from(m[3].replace(/\s+/g, ''), 'base64');
        if (buf.length) {
          return new NextResponse(buf, {
            headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=300' },
          });
        }
      }
    } catch { /* fall through to disk cache */ }
  }
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
