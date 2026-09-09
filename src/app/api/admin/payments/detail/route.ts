import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/payments/detail?paymentId= — fraud investigation bundle:
// payment + verification + fraud assessment/events + OCR/screenshot evidence +
// related registrations (same txn / screenshot / email / phone / roll) + audit timeline.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const id = Number(new URL(req.url).searchParams.get('paymentId') || 0);
    if (!id) return NextResponse.json({ error: 'paymentId required' }, { status: 400 });
    const pay: any = db().prepare('SELECT * FROM payments WHERE id=?').get(id);
    if (!pay) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(pay.registration_id);
    const members: any[] = (() => { try { return db().prepare('SELECT * FROM team_members WHERE registration_id=? ORDER BY idx').all(pay.registration_id); } catch { return []; } })();
    const fraudEvents: any[] = (() => { try { return db().prepare('SELECT * FROM fraud_events WHERE payment_id=? OR registration_id=? ORDER BY id DESC LIMIT 50').all(id, pay.registration_id); } catch { return []; } })();
    const related: any = {};
    try {
      const byTxn = pay.transaction_id ? db().prepare('SELECT registration_id, team_name FROM registrations WHERE registration_id IN (SELECT registration_id FROM payments WHERE transaction_id=? AND registration_id!=?) LIMIT 10').all(pay.transaction_id, pay.registration_id) : [];
      const byShot = pay.screenshot_hash ? db().prepare('SELECT registration_id FROM payments WHERE screenshot_hash=? AND registration_id!=? LIMIT 10').all(pay.screenshot_hash, pay.registration_id) : [];
      const byEmail = reg ? db().prepare('SELECT registration_id, team_name FROM registrations WHERE leader_email=? AND registration_id!=? LIMIT 10').all(reg.leader_email, pay.registration_id) : [];
      const byPhone = reg ? db().prepare('SELECT registration_id, team_name FROM registrations WHERE leader_phone=? AND registration_id!=? LIMIT 10').all(reg.leader_phone, pay.registration_id) : [];
      related.byTransaction = byTxn; related.byScreenshot = byShot; related.byEmail = byEmail; related.byPhone = byPhone;
    } catch { /* best effort */ }
    const timeline: any[] = (() => { try { return db().prepare('SELECT * FROM audit_log WHERE registration_id=? ORDER BY id DESC LIMIT 50').all(pay.registration_id); } catch { return []; } })();
    let reasons: any[] = [];
    try { reasons = JSON.parse(pay.risk_reasons || '[]'); } catch { reasons = []; }
    return NextResponse.json({ payment: pay, registration: reg, members, fraud: { score: pay.fraud_risk_score, level: pay.fraud_risk_level, status: pay.fraud_status, reasons }, fraudEvents, related, timeline });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
