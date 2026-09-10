import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentTeam, getTeamPublic } from '@/lib/team-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authenticated team profile. The backend derives the team from the secure
// session cookie — any Team ID sent by the frontend is ignored, so Team A can
// never read Team B by changing parameters.
export async function GET() {
  try {
    const t = await currentTeam();
    if (!t) return NextResponse.json({ error: 'Please log in to view your dashboard.' }, { status: 401 });
    const reg = getTeamPublic(t.registrationId);
    if (!reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    const members: any[] = db().prepare(
      'SELECT idx, name, roll_number, email, phone, college, department, year FROM team_members WHERE registration_id=? ORDER BY idx',
    ).all(t.registrationId);
    const pay: any = db().prepare(
      `SELECT provider, payment_method, payment_status, verification_status, amount, currency,
        payment_reference, created_at, verified_at FROM payments WHERE registration_id=? ORDER BY id DESC LIMIT 1`,
    ).get(t.registrationId);
    return NextResponse.json({ registration: reg, members, payment: pay || null });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
