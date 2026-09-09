import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { audit, db } from '@/lib/db';
export async function GET() {
  try { await requireAdmin(); return NextResponse.json(db().prepare('SELECT * FROM settings WHERE id=1').get()); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const b = await req.json();
    const cols = ['hackathon_name', 'description', 'registration_fee', 'upi_id', 'min_team_size', 'max_team_size', 'reg_open', 'reg_start', 'reg_end', 'venue', 'contact_email', 'contact_phone', 'rules', 'eligibility', 'reg_prefix', 'schedule_json'];
    const cur: any = db().prepare('SELECT * FROM settings WHERE id=1').get();
    const v: any = {};
    for (const c of cols) v[c] = b[c] !== undefined ? b[c] : cur[c];
    db().prepare('UPDATE settings SET hackathon_name=?,description=?,registration_fee=?,upi_id=?,min_team_size=?,max_team_size=?,reg_open=?,reg_start=?,reg_end=?,venue=?,contact_email=?,contact_phone=?,rules=?,eligibility=?,reg_prefix=?,schedule_json=?,updated_at=datetime(\'now\') WHERE id=1')
      .run(v.hackathon_name, v.description, Number(v.registration_fee) || 0, v.upi_id, Number(v.min_team_size) || 1, Number(v.max_team_size) || 4, v.reg_open ? 1 : 0, v.reg_start || '', v.reg_end || '', v.venue || '', v.contact_email || '', v.contact_phone || '', v.rules || '', v.eligibility || '', v.reg_prefix || 'VX2026', typeof v.schedule_json === 'string' ? v.schedule_json : JSON.stringify(v.schedule_json || []));
    audit('SETTINGS_UPDATED', admin.email, '', 'settings updated');
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
