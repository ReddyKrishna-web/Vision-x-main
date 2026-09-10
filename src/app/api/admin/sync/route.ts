import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { audit, db } from '@/lib/db';
import { getSyncHealth } from '@/lib/excel/sync-queue';
import { processPendingSyncs, processSyncJob, recoverPendingSyncs } from '@/lib/excel/sync-engine';
import { rebuildWorkbookFromDb, workbookPath } from '@/lib/excel/workbook';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const action = new URL(req.url).searchParams.get('action') || 'status';
    if (action === 'download') {
      const p = workbookPath();
      if (!fs.existsSync(p)) {
        await rebuildWorkbookFromDb();
      }
      const buf = fs.readFileSync(workbookPath());
      audit('EXCEL_DOWNLOAD_REQUESTED', (await requireAdmin()).email, '', '');
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="VISION_X_2026_REGISTRATIONS.xlsx"',
        },
      });
    }
    const health = getSyncHealth();
    const recent: any[] = db().prepare('SELECT * FROM excel_sync_jobs ORDER BY id DESC LIMIT 50').all();
    let size = 0;
    try { size = fs.statSync(workbookPath()).size; } catch {}
    return NextResponse.json({ health, recent, workbook: { path: workbookPath(), size, exists: fs.existsSync(workbookPath()) } });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { action, jobId } = await req.json();
    if (action === 'sync-pending' || action === 'retry-failed') {
      const r = await processPendingSyncs(100);
      return NextResponse.json({ ok: true, ...r });
    }
    if (action === 'retry-job' && jobId) {
      await processSyncJob(Number(jobId));
      return NextResponse.json({ ok: true });
    }
    if (action === 'recover') {
      await recoverPendingSyncs();
      return NextResponse.json({ ok: true });
    }
    if (action === 'rebuild') {
      const r = await rebuildWorkbookFromDb();
      audit('EXCEL_WORKBOOK_REBUILT', admin.email, '', `count=${r.count}`);
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
