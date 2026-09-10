import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth';
import { audit, db, getSettings, UPLOAD_DIR_PATH } from '@/lib/db';
import { parseImageDataUrl } from '@/lib/payment/upi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QR_MAX_BYTES = 3 * 1024 * 1024;

// POST /api/admin/payment-settings/qr { imageDataUrl } — upload a new UPI QR.
//
// Safe replacement: the new file is written and validated FIRST, settings
// are updated only after the write succeeds, and the old file is removed
// only after the update succeeds — a failed upload can never leave the
// payment page without its currently active QR.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const b = await req.json();
    let img;
    try {
      img = parseImageDataUrl(b?.imageDataUrl, QR_MAX_BYTES);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Invalid image.' }, { status: e?.status || 400 });
    }
    const name = `upi-qr-${Date.now()}.${img.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR_PATH, name), img.buf);

    const prev = String(getSettings().qr_image_path || '').trim();
    db().prepare(`UPDATE settings SET qr_image_path=?, updated_at=datetime('now') WHERE id=1`).run(name);

    if (prev && prev !== name) {
      try {
        const old = path.join(UPLOAD_DIR_PATH, path.basename(prev));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      } catch { /* old file cleanup is best-effort only */ }
    }
    audit('PAYMENT_QR_UPDATED', admin.email, '', name);
    return NextResponse.json({ ok: true, qrImageUrl: '/api/payment-qr' });
  } catch (e: any) {
    const st = e?.status === 401 ? 401 : 400;
    return NextResponse.json({ error: e?.message || 'Could not upload QR.' }, { status: st });
  }
}
