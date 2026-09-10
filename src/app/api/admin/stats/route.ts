import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  try {
    await requireAdmin();
    const total: any = db().prepare('SELECT COUNT(*) c FROM registrations').get();
    const parts: any = db().prepare('SELECT COUNT(*) c FROM team_members').get();
    const pays: any[] = db().prepare('SELECT payment_status s, COUNT(*) c FROM payments GROUP BY s').all();
    const by: any = { PENDING: 0, OCR_DETECTED: 0, MANUAL_REVIEW: 0, VERIFIED: 0, REJECTED: 0, DUPLICATE: 0 };
    for (const p of pays) by[p.s] = p.c;
    const recent: any[] = db().prepare('SELECT r.registration_id, r.team_name, r.leader_name, r.college, r.team_size, p.payment_status, r.created_at FROM registrations r LEFT JOIN payments p ON p.registration_id=r.registration_id ORDER BY r.id DESC LIMIT 10').all();
    let sync: any = { pending: 0, failed: 0, healthy: true, lastSyncedAt: null };
    try {
      const { getSyncHealth } = await import('@/lib/excel/sync-queue');
      sync = getSyncHealth();
    } catch {}
    return NextResponse.json({ total: total.c, participants: parts.c, by, recent, sync });
  } catch (e: any) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
