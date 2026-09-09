import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, db, getSettings, nextRegistrationId } from '@/lib/db';
import { memberSchema, sanitize, teamInfoSchema } from '@/lib/validators';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from '@/lib/payment/razorpay';
import { setPaymentStatus } from '@/lib/payment/payment-router';
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

// Creates a registration draft (PAYMENT_PENDING) + internal payment record +
// Razorpay order. Amount is authoritative server-side; the client only receives
// the public Key ID + order id needed for Razorpay Checkout.
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit()) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    const s = getSettings();
    if (!s.reg_open) return NextResponse.json({ error: 'Registrations are currently closed.' }, { status: 403 });
    if (!razorpayConfigured()) {
      return NextResponse.json({ error: 'Online payment is not configured yet. Please try again later.' }, { status: 503 });
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
    ).run(regId, 'razorpay', fee, 'INR', 'RAZORPAY', 'CREATED', 'UNVERIFIED', now, now);
    const paymentId = Number(payRow.lastInsertRowid);

    let order;
    try {
      order = await createRazorpayOrder({
        registrationId: regId,
        amountRupees: fee,
        teamName: team.teamName,
        customerName: team.leaderName,
        customerEmail: team.leaderEmail,
        customerPhone: team.leaderPhone,
      });
    } catch (e: any) {
      try { setPaymentStatus(paymentId, 'FAILED', { event: 'PAYMENT_ORDER_FAILED' }); } catch {}
      if (e?.log) audit('PAYMENT_ORDER_FAILED', '', regId, String(e.log).slice(0, 300));
      return NextResponse.json({ error: e?.message || 'Payment session could not be created. Please try again.' }, { status: e?.status || 502 });
    }
    db().prepare(`UPDATE payments SET provider_order_id=?, provider_session_id=?, payment_reference=?, payment_status='PENDING', updated_at=? WHERE id=?`)
      .run(order.id, order.id, order.id, now, paymentId);

    // Baseline fraud screen (duplicates/velocity) at order time.
    try {
      assessPaymentRisk({
        registrationId: regId, paymentId, amount: fee, expectedAmount: fee,
        memberRolls: members.map((m) => m.rollNumber), email: team.leaderEmail, phone: team.leaderPhone,
        ip: req.headers.get('x-forwarded-for') || '',
      });
    } catch { /* never block order creation on risk engine errors */ }

    audit('PAYMENT_CREATED', '', regId, 'provider=razorpay');
    return NextResponse.json({
      registrationId: regId,
      paymentId,
      provider: 'razorpay',
      checkout: {
        provider: 'razorpay',
        orderId: order.id,
        amount: fee,
        amountPaise: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId(),
        registrationId: regId,
        teamName: team.teamName,
        customerName: team.leaderName,
        customerEmail: team.leaderEmail,
        customerPhone: team.leaderPhone,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: e?.status || 500 });
  }
}
