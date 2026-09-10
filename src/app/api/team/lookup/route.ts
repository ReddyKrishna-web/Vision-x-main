import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { maskEmail, maskPhone, normalizeId } from '@/lib/team-auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ registrationId: z.string().min(3).max(32) });

// First-time login detection: tells the client whether this Team ID exists
// and whether a password was already created — never returns secrets.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (!rateLimit('team-lookup:' + ip, 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Please enter your Team ID.' }, { status: 400 });
    const id = normalizeId(parsed.data.registrationId);
    const reg: any = db().prepare('SELECT team_name, leader_email, leader_phone, password_created FROM registrations WHERE registration_id=?').get(id);
    if (!reg) {
      return NextResponse.json({ error: 'We could not find a registered team with this Team ID.' }, { status: 404 });
    }
    const created = Number(reg.password_created || 0) === 1;
    return NextResponse.json({
      teamName: reg.team_name,
      passwordCreated: created,
      // Ownership hints shown only before a password exists, so the real
      // leader recognises their record. Never returned after setup.
      emailHint: created ? undefined : maskEmail(reg.leader_email),
      phoneHint: created ? undefined : maskPhone(reg.leader_phone),
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
