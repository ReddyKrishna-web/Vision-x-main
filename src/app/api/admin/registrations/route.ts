import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { stripTeamSecrets } from '@/lib/team-auth';
import { audit, db } from '@/lib/db';
import { setPaymentStatus } from '@/lib/payment/payment-router';
import { normalizeLegacyStatus } from '@/lib/payment/state-machine';
import { triggerSync } from '@/lib/excel/sync-engine';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = new URL(req.url).searchParams;
    const search = (q.get('search') || '').trim();
    const pay = q.get('pay') || '';
    const where: string[] = []; const args: any[] = [];
    if (search) { where.push('(r.registration_id LIKE ? OR r.team_name LIKE ? OR r.leader_name LIKE ? OR r.leader_email LIKE ? OR p.transaction_id LIKE ?)'); const s = `%${search}%`; args.push(s, s, s, s, s); }
    if (pay) {
      // Backward compat: legacy OCR_DETECTED/MANUAL_REVIEW filters map to REVIEW_REQUIRED.
      const norm = normalizeLegacyStatus(pay);
      if (pay === 'OCR_DETECTED' || pay === 'MANUAL_REVIEW') where.push(`p.payment_status IN ('REVIEW_REQUIRED','${pay}')`);
      else { where.push('p.payment_status=?'); args.push(norm); }
    }
    const rows: any[] = db().prepare(`SELECT r.*, p.transaction_id, p.payment_status, p.amount FROM registrations r LEFT JOIN payments p ON p.registration_id=r.registration_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.id DESC LIMIT 500`).all(...args);
    // Credential columns must never reach the admin UI.
    return NextResponse.json({ rows: rows.map(stripTeamSecrets) });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { registrationId, action, note } = await req.json();
    const pay: any = db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1').get(registrationId);
    if (!pay) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    const now = new Date().toISOString();
    if (action === 'VERIFY') {
      try { setPaymentStatus(pay.id, 'VERIFIED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_VERIFIED' }); }
      catch { db().prepare('UPDATE payments SET payment_status=?, verified_by=?, verified_at=?, admin_notes=COALESCE(?, admin_notes), updated_at=? WHERE id=?').run('VERIFIED', admin.email, now, note || null, now, pay.id); }
      try { setPaymentStatus(pay.id, 'CONFIRMED', { admin: admin.email, event: 'PAYMENT_CONFIRMED' }); }
      catch { db().prepare('UPDATE payments SET payment_status=?, updated_at=? WHERE id=?').run('CONFIRMED', now, pay.id); }
      if (note) db().prepare('UPDATE payments SET admin_notes=? WHERE id=?').run(note, pay.id);
      db().prepare('UPDATE registrations SET registration_status=?, confirmed_at=COALESCE(NULLIF(confirmed_at,\'\'), ?), updated_at=? WHERE registration_id=?')
        .run('CONFIRMED', now, now, registrationId);
      try { db().prepare('UPDATE payments SET verification_status=? WHERE id=?').run('VERIFIED', pay.id); } catch {}
      audit('REGISTRATION_FINALIZED', admin.email, registrationId, 'admin verified');
      triggerSync(registrationId);
      return NextResponse.json({ ok: true, status: 'CONFIRMED' });
    }
    if (action === 'REJECT') {
      try { setPaymentStatus(pay.id, 'REJECTED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_REJECTED' }); }
      catch { db().prepare('UPDATE payments SET payment_status=?, verified_by=?, verified_at=?, admin_notes=COALESCE(?, admin_notes), updated_at=? WHERE id=?').run('REJECTED', admin.email, now, note || null, now, pay.id); }
      db().prepare('UPDATE registrations SET registration_status=?, updated_at=? WHERE registration_id=?').run('REJECTED', now, registrationId);
      triggerSync(registrationId);
      return NextResponse.json({ ok: true, status: 'REJECTED' });
    }
    if (action === 'DUPLICATE') {
      try { setPaymentStatus(pay.id, 'DUPLICATE', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_DUPLICATE' }); }
      catch { db().prepare('UPDATE payments SET payment_status=?, verified_by=?, verified_at=?, admin_notes=COALESCE(?, admin_notes), updated_at=? WHERE id=?').run('DUPLICATE', admin.email, now, note || null, now, pay.id); }
      db().prepare('UPDATE registrations SET registration_status=?, updated_at=? WHERE registration_id=?').run('DUPLICATE', now, registrationId);
      triggerSync(registrationId);
      return NextResponse.json({ ok: true, status: 'DUPLICATE' });
    }
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
