import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db, getSettings, nextRegistrationId } from '@/lib/db';
import { memberSchema, sanitize, teamInfoSchema } from '@/lib/validators';
import { upiPaymentsConfigured } from '@/lib/payment/upi';
import { assessPaymentRisk } from '@/lib/fraud';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  team: teamInfoSchema,
  members: z.array(memberSchema).min(1).max(6),
  consent: z.literal(true),
});

const hits: number[] = [];
function rateLimit(): boolean {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60000) hits.shift();
  if (hits.length >= 30) return false;
  hits.push(now);
  return true;
}

// Creates a registration (PENDING_PAYMENT) + manual-UPI payment record
// (PENDING). No gateway order is created: the user pays by scanning the
// admin-configured QR in their own UPI app, then submits the UTR proof via
// POST /api/payments/submit-proof. Amount is authoritative server-side.
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit()) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    const s = getSettings();
    if (!s.reg_open) return NextResponse.json({ error: 'Registrations are currently closed.' }, { status: 403 });
    if (!upiPaymentsConfigured()) {
      return NextResponse.json({ error: 'UPI payment is not configured yet. Please try again later.' }, { status: 503 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please complete all required fields.' }, { status: 400 });
    }
    const { team, members } = parsed.data;
    if (team.teamSize !== members.length) return NextResponse.json({ error: 'Team size does not match members.' }, { status: 400 });
    if (team.teamSize < s.min_team_size || team.teamSize > s.max_team_size) {
      return NextResponse.json({ error: `Team size must be ${s.min_team_size}-${s.max_team_size}.` }, { status: 400 });
    }
    const rolls = members.map((m) => m.rollNumber.trim().toLowerCase());
    if (new Set(rolls).size !== rolls.length) return NextResponse.json({ error: 'Roll numbers must be unique within a team.' }, { status: 400 });

    const regId = nextRegistrationId(s.reg_prefix || 'VX2026');
    const now = new Date().toISOString();
    const fee = Number(s.registration_fee || 0);
    db().prepare(
      'INSERT INTO registrations (registration_id,team_name,team_size,leader_name,leader_email,leader_phone,college,department,year,registration_status,flags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(regId, sanitize(team.teamName), team.teamSize, sanitize(team.leaderName), team.leaderEmail.toLowerCase(), team.leaderPhone, sanitize(team.college), sanitize(team.department), sanitize(team.year), 'PENDING_PAYMENT', '[]', now, now);
    members.forEach((m, i) => {
      db().prepare('INSERT INTO team_members (registration_id,idx,name,roll_number,email,phone,college,department,year) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(regId, i + 1, sanitize(m.name), sanitize(m.rollNumber), m.email.toLowerCase(), m.phone, sanitize(m.college || team.college), sanitize(m.department || team.department), sanitize(m.year || team.year));
    });

    const payRow: any = db().prepare(
      `INSERT INTO payments (registration_id,provider,amount,currency,payment_method,payment_status,verification_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(regId, 'upi_manual', fee, 'INR', 'UPI', 'PENDING', 'UNVERIFIED', now, now);
    const paymentId = Number(payRow.lastInsertRowid);

    // Baseline fraud screen (duplicates/velocity) at registration time.
    try {
      assessPaymentRisk({
        registrationId: regId, paymentId, amount: fee, expectedAmount: fee,
        memberRolls: members.map((m) => m.rollNumber), email: team.leaderEmail, phone: team.leaderPhone,
        ip: req.headers.get('x-forwarded-for') || '',
      });
    } catch { /* never block registration on risk engine errors */ }

    audit('PAYMENT_CREATED', '', regId, 'provider=upi_manual');
    return NextResponse.json({
      registrationId: regId,
      paymentId,
      provider: 'upi_manual',
      amount: fee,
      currency: 'INR',
      teamName: team.teamName,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: e?.status || 500 });
  }
}
