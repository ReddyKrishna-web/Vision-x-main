import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createTeamResetToken, normalizeId } from '@/lib/team-auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  registrationId: z.string().min(3).max(32),
  leaderEmail: z.string().email('Please enter the registered leader email.'),
  leaderPhone: z.string().min(10).max(15),
});

// Step 1 of Forgot Password: verify Team Leader ownership (email + phone).
// Team ID alone is never sufficient. Returns a short-lived reset token.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (!rateLimit('team-forgot:' + ip, 15, 600_000)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please complete all fields.' }, { status: 400 });
    }
    const id = normalizeId(parsed.data.registrationId);
    if (!rateLimit('team-forgot-id:' + id, 8, 600_000)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429 });
    }
    const reg: any = db().prepare('SELECT leader_email, leader_phone, password_created FROM registrations WHERE registration_id=?').get(id);
    if (!reg) {
      return NextResponse.json({ error: 'We could not find a registered team with this Team ID.' }, { status: 404 });
    }
    const emailOk = String(reg.leader_email || '').toLowerCase() === String(parsed.data.leaderEmail || '').toLowerCase().trim();
    const phoneOk = String(reg.leader_phone || '').replace(/\D/g, '') === String(parsed.data.leaderPhone || '').replace(/\D/g, '');
    if (!emailOk || !phoneOk) {
      return NextResponse.json({ error: 'Those leader details do not match our records for this Team ID.' }, { status: 403 });
    }
    const resetToken = await createTeamResetToken(id);
    return NextResponse.json({ ok: true, resetToken });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
