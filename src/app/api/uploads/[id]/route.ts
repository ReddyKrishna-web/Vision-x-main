import { NextRequest, NextResponse } from 'next/server';
import { db, UPLOAD_DIR_PATH } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import fs from 'node:fs';
import path from 'node:path';
export const runtime = 'nodejs';
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const row: any = db().prepare('SELECT * FROM pending_uploads WHERE id=?').get(params.id)
      ?? db().prepare('SELECT screenshot_path AS path FROM payments WHERE registration_id=?').get(params.id);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const f = path.join(UPLOAD_DIR_PATH, row.path || row.screenshot_path || '');
    if (!fs.existsSync(f)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const buf = fs.readFileSync(f);
    const ext = path.extname(f).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return new NextResponse(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=60' } });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: e.status || 401 });
  }
}
