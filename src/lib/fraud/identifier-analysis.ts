// Deterministic identifier analysis: normalized comparisons, no ML claims.
export function normEmail(e: string): string {
  return String(e || '').trim().toLowerCase();
}
export function normPhone(p: string): string {
  return String(p || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
}
export function normRoll(r: string): string {
  return String(r || '').trim().toLowerCase().replace(/\s+/g, '');
}
export function normTxnId(t: string): string {
  return String(t || '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 64);
}

// UPI UTR / bank reference formats commonly seen: 12-digit UTR, 22-char UPI ref, alphanumeric 6-22.
export function txnFormatValid(t: string): boolean {
  const v = normTxnId(t);
  if (!v) return false;
  if (/^\d{12}$/.test(v)) return true;
  if (/^[A-Z0-9]{6,22}$/.test(v)) return true;
  return false;
}
