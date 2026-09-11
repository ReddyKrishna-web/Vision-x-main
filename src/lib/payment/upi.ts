// Admin-managed manual UPI payments (replaces the Razorpay gateway).
//
// Money moves entirely inside the payer's own UPI app by scanning the
// admin-configured QR: this server never touches funds, so payment can only
// be *claimed* here (UTR + optional screenshot) and is CONFIRMED later by an
// admin reviewing the proof. No gateway SDK, no secrets.
import fs from 'node:fs';
import path from 'node:path';
import { getSettings, UPLOAD_DIR_PATH } from '@/lib/db';

// Accepts handles like `example@upi`, `name@okbank`, `99999@upi`.
export const UPI_ID_RE = /^[a-zA-Z0-9._\-]{2,}@[a-zA-Z]{2,}$/;

export function upiId(): string {
  try {
    return String(getSettings().upi_id || '').trim();
  } catch {
    return '';
  }
}

export function qrImageName(): string {
  try {
    return String(getSettings().qr_image_path || '').trim();
  } catch {
    return '';
  }
}

// DB-backed QR image (Vercel-safe): full `data:image/...` URL stored in
// settings.qr_image_data. Preferred over the file copy because serverless
// filesystems are read-only/ephemeral while the DB row survives per-instance.
export function qrImageDataUrl(): string {
  try {
    const s: any = getSettings();
    const v = String(s.qr_image_data || '').trim();
    if (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/.test(v)) return v;
    return '';
  } catch {
    return '';
  }
}

// Absolute path of the active QR file, or null when not configured.
// basename() confines serving to the upload dir (no path traversal).
// Returns null when the setting holds a DB data URL (no file to serve).
export function qrImageFile(): string | null {
  const rel = qrImageName();
  if (!rel || rel.startsWith('data:')) return null;
  const f = path.join(UPLOAD_DIR_PATH, path.basename(rel));
  try {
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  } catch {
    /* not configured */
  }
  return null;
}

// The payment UI is enabled only when BOTH are live: a valid UPI ID and an
// actual QR image (DB data URL preferred, disk file as fallback). Updating
// either in Payment Settings reflects immediately because every check reads
// live settings (+ disk as fallback).
export function upiPaymentsConfigured(): boolean {
  return UPI_ID_RE.test(upiId()) && (qrImageDataUrl() !== '' || qrImageFile() !== null);
}

export type ParsedImage = { ext: 'png' | 'jpg'; buf: Buffer };

// Strictly validate a `data:image/png|jpeg;base64,…` upload: MIME allowlist,
// byte budget, and magic-byte sniffing (never trust the claimed MIME alone).
export function parseImageDataUrl(dataUrl: unknown, maxBytes: number): ParsedImage {
  const s = String(dataUrl || '');
  const m = /^data:(image\/(png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(s);
  if (!m) throw Object.assign(new Error('Only PNG or JPG/JPEG images are accepted.'), { status: 400 });
  const kind = m[2];
  let buf: Buffer;
  try {
    buf = Buffer.from(m[3].replace(/\s+/g, ''), 'base64');
  } catch {
    throw Object.assign(new Error('Could not read that image. Please try again.'), { status: 400 });
  }
  if (!buf.length || buf.length > maxBytes) {
    throw Object.assign(new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`), { status: 400 });
  }
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (kind === 'png' && !isPng) throw Object.assign(new Error('That file is not a valid PNG image.'), { status: 400 });
  if (kind === 'jpeg' && !isJpg) throw Object.assign(new Error('That file is not a valid JPG image.'), { status: 400 });
  return { ext: kind === 'png' ? 'png' : 'jpg', buf };
}
