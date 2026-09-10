import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db } from '@/lib/db';
import { hashTeamPassword, normalizeId, validateTeamPassword } from '@/lib/team-auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  registrationId: z.string().min(3).max(32),
  leaderEmail: z.string().email('Please enter the registered leader email.'),
  leaderPhone: z.string().min(10).max(15),
  newPassword: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
});

// First-time password creation. Team ID alone is NOT enough: the caller must
// also prove ownership with the registered leader email + phone number.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (!rateLimit('team-setup:' + ip, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please complete all fields.' }, { status: 400 });
    }
    const { leaderEmail, leaderPhone, newPassword, confirmPassword } = parsed.data;
    const id = normalizeId(parsed.data.registrationId);

    const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(id);
    if (!reg) {
      return NextResponse.json({ error: 'We could not find a registered team with this Team ID.' }, { status: 404 });
    }
    if (Number(reg.password_created || 0) === 1) {
      return NextResponse.json({ error: 'A password has already been created for this team. Please log in or use Forgot Password.', passwordCreated: true }, { status: 409 });
    }
    // Ownership check against the registration record (case-insensitive email).
    const emailOk = String(reg.leader_email || '').toLowerCase() === String(leaderEmail || '').toLowerCase().trim();
    const phoneOk = String(reg.leader_phone || '').replace(/\D/g, '') === String(leaderPhone || '').replace(/\D/g, '');
    if (!emailOk || !phoneOk) {
      return NextResponse.json({ error: 'Those leader details do not match our records for this Team ID.' }, { status: 403 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'The passwords do not match. Please try again.' }, { status: 400 });
    }
    const policyErr = validateTeamPassword(newPassword);
    if (policyErr) return NextResponse.json({ error: policyErr }, { status: 400 });

    const hash = await hashTeamPassword(newPassword);
    const now = new Date().toISOString();
    db().prepare(`UPDATE registrations SET team_password_hash=?, password_created=1,
      password_created_at=?, password_updated_at=?, updated_at=? WHERE registration_id=?`)
      .run(hash, now, now, now, id);
    audit('TEAM_PASSWORD_CREATED', '', id, 'first-time setup');

    // Never return the password — only identity + status.
    return NextResponse.json({
      ok: true,
      teamName: reg.team_name,
      registrationId: id,
      passwordStatus: 'Created Successfully',
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
