import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  try {
    await requireAdmin();
    const rows = db().prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
    return NextResponse.json({ rows });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
