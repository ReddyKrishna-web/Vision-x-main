import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { audit, db } from '@/lib/db';
import { setPaymentStatus } from '@/lib/payment/payment-router';
import { triggerSync } from '@/lib/excel/sync-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/payments?search=&status=&provider=&risk=&limit=
// Returns revenue stats + paginated payment rows for the command center.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = new URL(req.url).searchParams;
    const search = (q.get('search') || '').trim();
    const status = q.get('status') || '';
    const provider = q.get('provider') || '';
    const risk = q.get('risk') || '';
    const limit = Math.min(500, Math.max(1, Number(q.get('limit') || 100)));

    const where: string[] = [];
    const args: any[] = [];
    if (search) {
      where.push('(r.registration_id LIKE ? OR r.team_name LIKE ? OR r.leader_name LIKE ? OR r.leader_email LIKE ? OR p.transaction_id LIKE ? OR p.provider_order_id LIKE ? OR p.provider_payment_id LIKE ?)');
      const s = `%${search}%`;
      args.push(s, s, s, s, s, s, s);
    }
    if (status) { where.push('p.payment_status=?'); args.push(status); }
    if (provider) { where.push('p.provider=?'); args.push(provider); }
    if (risk === 'HIGH') { where.push(`p.fraud_risk_level IN ('HIGH','CRITICAL')`); }
    if (risk === 'REVIEW') { where.push(`p.fraud_status IN ('REVIEW','BLOCKED','MONITOR')`); }

    const rows: any[] = db().prepare(
      `SELECT p.*, r.team_name, r.leader_name, r.leader_email, r.leader_phone, r.registration_status
       FROM payments p JOIN registrations r ON r.registration_id=p.registration_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.id DESC LIMIT ?`,
    ).all(...args, limit);

    let stats: any = { revenue: 0, success: 0, pending: 0, failed: 0, review: 0 };
    try {
      const s: any = db().prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN payment_status='CONFIRMED' THEN amount ELSE 0 END),0) revenue,
          COALESCE(SUM(CASE WHEN payment_status='CONFIRMED' THEN 1 ELSE 0 END),0) success,
          COALESCE(SUM(CASE WHEN payment_status IN ('PENDING','PROCESSING','VERIFYING','REVIEW_REQUIRED') THEN 1 ELSE 0 END),0) pending,
          COALESCE(SUM(CASE WHEN payment_status IN ('FAILED','EXPIRED','CANCELLED','REJECTED') THEN 1 ELSE 0 END),0) failed,
          COALESCE(SUM(CASE WHEN fraud_status IN ('REVIEW','BLOCKED') THEN 1 ELSE 0 END),0) review
         FROM payments`,
      ).get();
      stats = s;
      const total: any = db().prepare(`SELECT COUNT(*) c FROM payments`).get();
      stats.total = total?.c || 0;
      stats.successRate = stats.total ? Math.round((stats.success / stats.total) * 100) : 0;
    } catch { /* pre-migration */ }

    // Strip nothing here — admin-only route; secrets are never stored on payment rows.
    return NextResponse.json({ rows, stats });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH /api/admin/payments { paymentId, action: VERIFY|REJECT|REVIEW|DUPLICATE|CLEAR_FRAUD|NOTE, note }
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { paymentId, action, note } = await req.json();
    if (!paymentId || !action) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    const pay: any = db().prepare('SELECT * FROM payments WHERE id=?').get(paymentId);
    if (!pay) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

    const now = new Date().toISOString();
    if (action === 'VERIFY') {
      setPaymentStatus(paymentId, 'VERIFIED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_VERIFIED' });
      setPaymentStatus(paymentId, 'CONFIRMED', { admin: admin.email, event: 'PAYMENT_CONFIRMED' });
      db().prepare(`UPDATE registrations SET registration_status='CONFIRMED', confirmed_at=COALESCE(NULLIF(confirmed_at,''), ?), updated_at=? WHERE registration_id=?`).run(now, now, pay.registration_id);
      if (note) db().prepare(`UPDATE payments SET admin_notes=? WHERE id=?`).run(note, paymentId);
      triggerSync(pay.registration_id);
      return NextResponse.json({ ok: true, status: 'CONFIRMED' });
    }
    if (action === 'REJECT') {
      setPaymentStatus(paymentId, 'REJECTED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_REJECTED' });
      db().prepare(`UPDATE registrations SET registration_status='REJECTED', updated_at=? WHERE registration_id=?`).run(now, pay.registration_id);
      triggerSync(pay.registration_id);
      return NextResponse.json({ ok: true, status: 'REJECTED' });
    }
    if (action === 'REVIEW') {
      setPaymentStatus(paymentId, 'REVIEW_REQUIRED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_REVIEW' });
      return NextResponse.json({ ok: true, status: 'REVIEW_REQUIRED' });
    }
    if (action === 'DUPLICATE') {
      setPaymentStatus(paymentId, 'DUPLICATE', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_DUPLICATE' });
      triggerSync(pay.registration_id);
      return NextResponse.json({ ok: true, status: 'DUPLICATE' });
    }
    if (action === 'BLOCK') {
      setPaymentStatus(paymentId, 'FRAUD_BLOCKED', { admin: admin.email, note: note || '', event: 'ADMIN_PAYMENT_BLOCKED' });
      return NextResponse.json({ ok: true, status: 'FRAUD_BLOCKED' });
    }
    if (action === 'CLEAR_FRAUD') {
      db().prepare(`UPDATE payments SET fraud_status='CLEARED', fraud_risk_score=0, fraud_risk_level='LOW', admin_notes=?, updated_at=? WHERE id=?`)
        .run(note || pay.admin_notes || '', now, paymentId);
      try {
        db().prepare(`UPDATE fraud_events SET resolved=1 WHERE payment_id=?`).run(paymentId);
      } catch {}
      audit('ADMIN_FRAUD_CLEARED', admin.email, pay.registration_id, note || '');
      triggerSync(pay.registration_id);
      return NextResponse.json({ ok: true, status: 'CLEARED' });
    }
    if (action === 'NOTE') {
      db().prepare(`UPDATE payments SET admin_notes=?, updated_at=? WHERE id=?`).run(String(note || '').slice(0, 2000), now, paymentId);
      audit('ADMIN_PAYMENT_NOTE', admin.email, pay.registration_id, String(note || '').slice(0, 300));
      triggerSync(pay.registration_id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    const st = (e as any)?.status === 401 ? 401 : 400;
    return NextResponse.json({ error: (e as any)?.message || 'Action failed.' }, { status: st });
  }
}
