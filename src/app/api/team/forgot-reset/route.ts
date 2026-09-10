import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db } from '@/lib/db';
import { hashTeamPassword, validateTeamPassword, verifyTeamResetToken } from '@/lib/team-auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  resetToken: z.string().min(10).max(2048),
  newPassword: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
});

// Step 2 of Forgot Password: set the new password using the reset token.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (!rateLimit('team-reset:' + ip, 15, 600_000)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please complete all fields.' }, { status: 400 });
    }
    const { resetToken, newPassword, confirmPassword } = parsed.data;
    const t = await verifyTeamResetToken(resetToken);
    if (!t) {
      return NextResponse.json({ error: 'This reset link has expired. Please start Forgot Password again.' }, { status: 401 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'The passwords do not match. Please try again.' }, { status: 400 });
    }
    const policyErr = validateTeamPassword(newPassword);
    if (policyErr) return NextResponse.json({ error: policyErr }, { status: 400 });

    const reg: any = db().prepare('SELECT registration_id FROM registrations WHERE registration_id=?').get(t.registrationId);
    if (!reg) return NextResponse.json({ error: 'We could not find a registered team with this Team ID.' }, { status: 404 });

    const hash = await hashTeamPassword(newPassword);
    const now = new Date().toISOString();
    db().prepare(`UPDATE registrations SET team_password_hash=?, password_created=1,
      password_updated_at=?, updated_at=? WHERE registration_id=?`)
      .run(hash, now, now, t.registrationId);
    audit('TEAM_PASSWORD_RESET', '', t.registrationId, 'forgot-password flow');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
