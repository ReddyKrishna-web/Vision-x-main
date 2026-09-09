import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { db, audit } from '@/lib/db';

// Master workbook builder + idempotent row upsert (update-by-key, never duplicate).
// Sheets: Registrations | Team Members | Payments | Fraud Review | Sync Log

export function workbookPath(): string {
  return process.env.EXCEL_EXPORT_PATH || path.join(process.cwd(), 'data', 'vision-x-registrations.xlsx');
}

const HEADER_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
const HEADER_FONT: any = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

function styleSheet(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: ws.columns.length ? ws.getRow(1).getCell(ws.columns.length).address : 'A1' };
  const header = ws.getRow(1);
  header.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', wrapText: true };
  });
  header.height = 22;
  ws.columns.forEach((col: any) => {
    col.width = Math.min(42, Math.max(14, (col.width || 18)));
  });
}

function ensureSheet(wb: ExcelJS.Workbook, name: string, headers: string[]): ExcelJS.Worksheet {
  let ws = wb.getWorksheet(name);
  if (!ws) {
    ws = wb.addWorksheet(name);
    ws.addRow(headers);
    styleSheet(ws);
    return ws;
  }
  // If headers changed (upgrade), keep existing rows but ensure header row matches.
  const current = ws.getRow(1).values as any[];
  const same = headers.every((h, i) => current[i + 1] === h);
  if (!same) {
    ws.getRow(1).values = headers;
    styleSheet(ws);
  }
  return ws;
}

// Find row index (1-based) by key column value; returns -1 if absent.
function findRowByKey(ws: ExcelJS.Worksheet, keyCol: number, key: string): number {
  let found = -1;
  ws.eachRow((row, n) => {
    if (n === 1) return;
    if (String(row.getCell(keyCol).value ?? '') === key) found = n;
  });
  return found;
}

function upsertRow(ws: ExcelJS.Worksheet, keyCol: number, key: string, values: any[]) {
  const idx = findRowByKey(ws, keyCol, key);
  if (idx > 0) {
    const row = ws.getRow(idx);
    row.values = values;
  } else {
    ws.addRow(values);
  }
}

const REG_HEADERS = ['Registration ID', 'Status', 'Team Name', 'Leader Name', 'Leader Email', 'Leader Phone', 'College', 'Department', 'Year', 'Team Size', 'Fee', 'Total Paid', 'Provider', 'Pay Method', 'Pay Status', 'Verification', 'Fraud Score', 'Fraud Level', 'Created At', 'Confirmed At', 'Updated At'];
const MEM_HEADERS = ['Key', 'Registration ID', 'Team Name', 'Position', 'Member Name', 'Email', 'Phone', 'Roll Number', 'College', 'Department', 'Year', 'Created At'];
const PAY_HEADERS = ['Payment ID', 'Registration ID', 'Team Name', 'Provider', 'Provider Order ID', 'Provider Payment ID', 'Transaction ID', 'Payment Reference', 'Amount', 'Currency', 'Pay Method', 'Pay Status', 'Verification', 'Fraud Score', 'Fraud Level', 'Created At', 'Verified At'];
const FRAUD_HEADERS = ['Key', 'Registration ID', 'Team Name', 'Payment ID', 'Risk Score', 'Risk Level', 'Fraud Status', 'Recommended Action', 'Risk Reasons', 'Created At', 'Admin Notes'];
const LOG_HEADERS = ['Synced At', 'Registration ID', 'Entity', 'Result'];

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const p = workbookPath();
  if (fs.existsSync(p)) {
    try { await wb.xlsx.readFile(p); } catch { /* corrupted predecessor -> rebuild fresh */ }
  }
  return wb;
}

// Atomic write: tmp file + validate + rename.
async function atomicWrite(wb: ExcelJS.Workbook) {
  const dest = workbookPath();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + `.tmp-${process.pid}-${Date.now()}`;
  await wb.xlsx.writeFile(tmp);
  const st = fs.statSync(tmp);
  if (!st.size) throw new Error('Excel write produced empty file.');
  fs.renameSync(tmp, dest);
}

function actionFor(level: string): string {
  if (level === 'CRITICAL') return 'BLOCK';
  if (level === 'HIGH') return 'REVIEW';
  if (level === 'MEDIUM') return 'MONITOR';
  return 'ALLOW';
}

// Sync a single registration (idempotent). Called serialized via mutex in sync-engine.
export async function syncRegistrationToWorkbook(registrationId: string) {
  const reg: any = db().prepare('SELECT * FROM registrations WHERE registration_id=?').get(registrationId);
  if (!reg) throw new Error('Registration not found: ' + registrationId);
  const members: any[] = db().prepare('SELECT * FROM team_members WHERE registration_id=? ORDER BY idx').all(registrationId);
  const payments: any[] = db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id').all(registrationId);
  const frauds: any[] = (() => {
    try { return db().prepare('SELECT * FROM fraud_events WHERE registration_id=? ORDER BY id DESC LIMIT 20').all(registrationId); } catch { return []; }
  })();

  const wb = await loadWorkbook();
  const wsReg = ensureSheet(wb, 'Registrations', REG_HEADERS);
  const wsMem = ensureSheet(wb, 'Team Members', MEM_HEADERS);
  const wsPay = ensureSheet(wb, 'Payments', PAY_HEADERS);
  const wsFraud = ensureSheet(wb, 'Fraud Review', FRAUD_HEADERS);
  const wsLog = ensureSheet(wb, 'Sync Log', LOG_HEADERS);

  const pay = payments[0] || {};
  const totalPaid = ['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status)) ? Number(pay.amount || 0) : 0;
  upsertRow(wsReg, 1, reg.registration_id, [
    reg.registration_id, reg.registration_status, reg.team_name, reg.leader_name, reg.leader_email,
    reg.leader_phone, reg.college, reg.department, reg.year, reg.team_size,
    (() => { try { return (db().prepare('SELECT registration_fee f FROM settings WHERE id=1').get() as any)?.f || pay.amount || 0; } catch { return pay.amount || 0; } })(),
    totalPaid, pay.provider || '', pay.payment_method || '', pay.payment_status || '',
    pay.verification_status || '', pay.fraud_risk_score || 0, pay.fraud_risk_level || 'LOW',
    reg.created_at, reg.confirmed_at || '', reg.updated_at,
  ]);

  for (const m of members) {
    const key = `${reg.registration_id}#${m.idx}`;
    upsertRow(wsMem, 1, key, [key, reg.registration_id, reg.team_name, m.idx, m.name, m.email, m.phone, m.roll_number, m.college, m.department, m.year, reg.created_at]);
  }
  for (const p of payments) {
    upsertRow(wsPay, 1, String(p.id), [
      p.id, reg.registration_id, reg.team_name, p.provider || '', p.provider_order_id || '',
      p.provider_payment_id || '', p.transaction_id || '', p.payment_reference || '',
      p.amount || 0, p.currency || 'INR', p.payment_method || '', p.payment_status || '',
      p.verification_status || '', p.fraud_risk_score || 0, p.fraud_risk_level || 'LOW',
      p.created_at, p.verified_at || '',
    ]);
  }
  if (frauds.length || (pay.fraud_risk_score || 0) > 0) {
    const key = `${reg.registration_id}#${pay.id || 'na'}`;
    upsertRow(wsFraud, 1, key, [
      key, reg.registration_id, reg.team_name, pay.id || '', pay.fraud_risk_score || 0,
      pay.fraud_risk_level || 'LOW', pay.fraud_status || 'CLEAR', actionFor(pay.fraud_risk_level || 'LOW'),
      String(pay.risk_reasons || '').slice(0, 2000), new Date().toISOString(), pay.admin_notes || '',
    ]);
  }
  wsLog.addRow([new Date().toISOString(), reg.registration_id, 'REGISTRATION', 'SUCCESS']);
  if (wsLog.rowCount > 2000) wsLog.spliceRows(2, wsLog.rowCount - 2000);

  await atomicWrite(wb);
}

// Full rebuild from DB (admin disaster recovery): builds temp workbook then swaps.
export async function rebuildWorkbookFromDb(): Promise<{ count: number; path: string }> {
  const regs: any[] = db().prepare(`SELECT * FROM registrations ORDER BY id`).all();
  const dest = workbookPath();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const wb = new ExcelJS.Workbook();
  const wsReg = ensureSheet(wb, 'Registrations', REG_HEADERS);
  const wsMem = ensureSheet(wb, 'Team Members', MEM_HEADERS);
  const wsPay = ensureSheet(wb, 'Payments', PAY_HEADERS);
  const wsFraud = ensureSheet(wb, 'Fraud Review', FRAUD_HEADERS);
  const wsLog = ensureSheet(wb, 'Sync Log', LOG_HEADERS);
  for (const reg of regs) {
    const members: any[] = db().prepare('SELECT * FROM team_members WHERE registration_id=? ORDER BY idx').all(reg.registration_id);
    const payments: any[] = db().prepare('SELECT * FROM payments WHERE registration_id=? ORDER BY id').all(reg.registration_id);
    const pay = payments[0] || {};
    const totalPaid = ['CONFIRMED', 'VERIFIED'].includes(String(pay.payment_status)) ? Number(pay.amount || 0) : 0;
    wsReg.addRow([reg.registration_id, reg.registration_status, reg.team_name, reg.leader_name, reg.leader_email, reg.leader_phone, reg.college, reg.department, reg.year, reg.team_size, pay.amount || 0, totalPaid, pay.provider || '', pay.payment_method || '', pay.payment_status || '', pay.verification_status || '', pay.fraud_risk_score || 0, pay.fraud_risk_level || 'LOW', reg.created_at, reg.confirmed_at || '', reg.updated_at]);
    for (const m of members) wsMem.addRow([`${reg.registration_id}#${m.idx}`, reg.registration_id, reg.team_name, m.idx, m.name, m.email, m.phone, m.roll_number, m.college, m.department, m.year, reg.created_at]);
    for (const p of payments) wsPay.addRow([p.id, reg.registration_id, reg.team_name, p.provider || '', p.provider_order_id || '', p.provider_payment_id || '', p.transaction_id || '', p.payment_reference || '', p.amount || 0, p.currency || 'INR', p.payment_method || '', p.payment_status || '', p.verification_status || '', p.fraud_risk_score || 0, p.fraud_risk_level || 'LOW', p.created_at, p.verified_at || '']);
    if ((pay.fraud_risk_score || 0) > 0) wsFraud.addRow([`${reg.registration_id}#${pay.id || 'na'}`, reg.registration_id, reg.team_name, pay.id || '', pay.fraud_risk_score || 0, pay.fraud_risk_level || 'LOW', pay.fraud_status || 'CLEAR', actionFor(pay.fraud_risk_level || 'LOW'), String(pay.risk_reasons || '').slice(0, 2000), new Date().toISOString(), pay.admin_notes || '']);
  }
  wsLog.addRow([new Date().toISOString(), 'ALL', 'REBUILD', `SUCCESS count=${regs.length}`]);
  await atomicWrite(wb);
  audit('EXCEL_WORKBOOK_REBUILT', '', '', `count=${regs.length}`);
  return { count: regs.length, path: dest };
}
