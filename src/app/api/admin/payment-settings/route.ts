import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { audit, db, getSettings } from '@/lib/db';
import { UPI_ID_RE, qrImageFile, upiId } from '@/lib/payment/upi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/payment-settings — current UPI config (admin only).
export async function GET() {
  try {
    await requireAdmin();
    const s = getSettings();
    return NextResponse.json({
      upiId: upiId(),
      hasQr: qrImageFile() !== null,
      fee: s.registration_fee || 0,
      updatedAt: s.updated_at || '',
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PUT /api/admin/payment-settings { upiId } — update the UPI ID.
// Existing registrations are untouched; the payment page reads live settings.
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const b = await req.json();
    const id = String(b?.upiId || '').trim();
    if (!UPI_ID_RE.test(id)) {
      return NextResponse.json({ error: 'Enter a valid UPI ID, e.g. example@upi.' }, { status: 400 });
    }
    db().prepare(`UPDATE settings SET upi_id=?, updated_at=datetime('now') WHERE id=1`).run(id);
    audit('PAYMENT_SETTINGS_UPDATED', admin.email, '', `upi_id=${id}`);
    return NextResponse.json({ ok: true, upiId: id });
  } catch (e: any) {
    const st = e?.status === 401 ? 401 : 400;
    return NextResponse.json({ error: e?.message || 'Could not save.' }, { status: st });
  }
}
