import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db } from '@/lib/db';
import { TEAM_COOKIE, createTeamToken, normalizeId, verifyTeamPassword } from '@/lib/team-auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  registrationId: z.string().min(3).max(32),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    const id = normalizeId((parsed.success && parsed.data.registrationId) || '');
    if (!parsed.success || !id) {
      return NextResponse.json({ error: 'Please enter your Team ID and password.' }, { status: 400 });
    }
    if (!rateLimit('team-login:' + ip, 20, 600_000) || !rateLimit('team-login-id:' + id, 10, 600_000)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
    const { password } = parsed.data;

    const reg: any = db().prepare('SELECT team_password_hash, password_created FROM registrations WHERE registration_id=?').get(id);
    // Generic message either way: do not reveal whether a Team ID exists here.
    const invalid = () => NextResponse.json({ error: 'The Team ID or password is incorrect.' }, { status: 401 });
    if (!reg || Number(reg.password_created || 0) !== 1 || !reg.team_password_hash) {
      if (reg && Number(reg.password_created || 0) !== 1) {
        return NextResponse.json(
          { error: 'No password has been created for this team yet. Please complete first-time password setup.', passwordCreated: false },
          { status: 403 },
        );
      }
      return invalid();
    }
    const ok = await verifyTeamPassword(password, reg.team_password_hash);
    if (!ok) return invalid();

    const now = new Date().toISOString();
    db().prepare('UPDATE registrations SET last_login_at=? WHERE registration_id=?').run(now, id);
    audit('TEAM_LOGIN', '', id, 'team dashboard sign-in');

    const token = await createTeamToken(id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(TEAM_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
    return res;
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
