import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, currentAdmin } from '@/lib/auth';
import { stripTeamSecrets } from '@/lib/team-auth';
import { db } from '@/lib/db';
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id') || '';
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(id);
  if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const mems = db().prepare('SELECT * FROM team_members WHERE registration_id=? ORDER BY idx').all(id);
  const pay: any = db().prepare('SELECT * FROM payments WHERE registration_id=?').get(id);
  // Password hashes are never exposed — not even to admins.
  return NextResponse.json({ reg: stripTeamSecrets(reg), mems, pay, screenshotUrl: `/api/uploads/${id}` });
}
