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
// Safe replacement: the image is validated FIRST, the DB row (source of
// truth, works on read-only serverless like Vercel) is updated, and the disk
// file is written best-effort as a cache — a failed file write can never fail
// the upload or leave the payment page without its currently active QR.
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
    const mime = img.ext === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${img.buf.toString('base64')}`;

    const prev = String(getSettings().qr_image_path || '').trim();
    // Prefer the DB-backed column (V5 migration); fall back to the legacy
    // file-path-only column on DBs that haven't migrated yet.
    try {
      db().prepare(`UPDATE settings SET qr_image_path=?, qr_image_data=?, updated_at=datetime('now') WHERE id=1`).run(name, dataUrl);
    } catch {
      db().prepare(`UPDATE settings SET qr_image_path=?, updated_at=datetime('now') WHERE id=1`).run(dataUrl);
    }

    // Best-effort disk cache for Docker/Render/VPS (fails on Vercel
    // read-only FS — silently ignored since the DB is the source of truth).
    try {
      fs.writeFileSync(path.join(UPLOAD_DIR_PATH, name), img.buf);
    } catch { /* serverless read-only FS — DB copy is authoritative */ }

    if (prev && prev !== name && !prev.startsWith('data:')) {
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
