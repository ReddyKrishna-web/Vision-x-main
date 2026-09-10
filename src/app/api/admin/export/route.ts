import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireAdmin } from '@/lib/auth';
import { audit, db } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const scope = new URL(req.url).searchParams.get('scope') || 'ALL';
    let where = '';
    if (scope === 'VERIFIED') where = "WHERE p.payment_status='VERIFIED'";
    if (scope === 'PENDING') where = "WHERE p.payment_status IN ('PENDING','OCR_DETECTED','MANUAL_REVIEW')";
    if (scope === 'REJECTED') where = "WHERE p.payment_status='REJECTED'";
    if (scope === 'DUPLICATE') where = "WHERE p.payment_status='DUPLICATE'";
    const regs: any[] = db().prepare(`SELECT r.*, p.transaction_id, p.ocr_txn, p.manual_txn, p.amount, p.payment_method, p.payment_status, p.verified_at, p.admin_notes FROM registrations r LEFT JOIN payments p ON p.registration_id=r.registration_id ${where} ORDER BY r.id`).all();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registrations');
    const head = ['Registration ID', 'Registration Date', 'Team Name', 'Team Size', 'Leader Name', 'Leader Email', 'Leader Phone', 'College', 'Department', 'Year',
      'Member 1 Name', 'Member 1 Roll', 'Member 1 Email', 'Member 1 Phone', 'Member 2 Name', 'Member 2 Roll', 'Member 2 Email', 'Member 2 Phone',
      'Member 3 Name', 'Member 3 Roll', 'Member 3 Email', 'Member 3 Phone', 'Member 4 Name', 'Member 4 Roll', 'Member 4 Email', 'Member 4 Phone',
      'Member 5 Name', 'Member 5 Roll', 'Member 5 Email', 'Member 5 Phone', 'Member 6 Name', 'Member 6 Roll', 'Member 6 Email', 'Member 6 Phone',
      'Payment Method', 'Fee', 'Transaction ID', 'OCR Txn', 'Payment Status', 'Reg Status', 'Verified Date', 'Admin Notes'];
    ws.addRow(head);
    ws.getRow(1).font = { bold: true };
    for (const r of regs) {
      const mems: any[] = db().prepare('SELECT * FROM team_members WHERE registration_id=? ORDER BY idx').all(r.registration_id);
      const mcols: any[] = [];
      for (let i = 0; i < 6; i++) { const m = mems[i]; mcols.push(m?.name || '', m?.roll_number || '', m?.email || '', m?.phone || ''); }
      ws.addRow([r.registration_id, r.created_at, r.team_name, r.team_size, r.leader_name, r.leader_email, r.leader_phone, r.college, r.department, r.year,
        ...mcols, r.payment_method || 'UPI', r.amount || 0, r.transaction_id || '', r.ocr_txn || '', r.payment_status || '', r.registration_status || '', r.verified_at || '', r.admin_notes || '']);
    }
    ws.columns.forEach(c => { c.width = 20; });
    const buf = await wb.xlsx.writeBuffer();
    audit('EXCEL_EXPORT', admin.email, '', 'scope=' + scope);
    return new NextResponse(Buffer.from(buf as any), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="visionx-${scope.toLowerCase()}.xlsx"` } });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
