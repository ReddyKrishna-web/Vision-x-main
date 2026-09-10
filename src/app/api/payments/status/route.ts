import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public status poll: exposes ONLY safe fields (no secrets, no fraud internals).
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('registrationId') || '';
  if (!id) return NextResponse.json({ error: 'registrationId required' }, { status: 400 });
  const reg: any = db().prepare('SELECT registration_id, team_name, registration_status, created_at, confirmed_at FROM registrations WHERE registration_id=?').get(id);
  if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const pay: any = db().prepare('SELECT provider, payment_method, payment_status, verification_status, amount, currency, payment_reference, created_at, verified_at FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1').get(id);
  return NextResponse.json({ registration: reg, payment: pay || null });
}
