import { NextResponse } from 'next/server';
import { db, getSettings } from '@/lib/db';
import { upiPaymentsConfigured } from '@/lib/payment/upi';

export async function GET() {
  const s = getSettings();
  const regs = db().prepare('SELECT COUNT(*) c FROM registrations').get() as any;
  const pays = db().prepare("SELECT payment_status, COUNT(*) c FROM payments GROUP BY payment_status").all() as any[];
  const byStatus: Record<string, number> = {};
  for (const p of pays) byStatus[p.payment_status] = p.c;
  const participants = db().prepare('SELECT COUNT(*) c FROM team_members').get() as any;
  return NextResponse.json({
    hackathonName: s.hackathon_name,
    description: s.description,
    fee: s.registration_fee,
    minTeam: s.min_team_size, maxTeam: s.max_team_size,
    regOpen: !!s.reg_open, regStart: s.reg_start, regEnd: s.reg_end,
    venue: s.venue || 'Annamayya Auditorium',
    locationName: s.location_name || 'Annamacharya Institute of Technology And Sciences',
    locationAddress: s.location_address || '',
    mapEmbedUrl: s.map_embed_url || '',
    mapLink: s.map_link || '',
    contactEmail: s.contact_email, contactPhone: s.contact_phone,
    rules: s.rules, eligibility: s.eligibility, regPrefix: s.reg_prefix,
    schedule: s.schedule || [],
    paymentsConfigured: upiPaymentsConfigured(),
    stats: { registrations: regs.c, participants: participants.c, byStatus },
  });
}
