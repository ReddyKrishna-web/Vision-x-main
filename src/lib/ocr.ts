export type OcrResult = {
  txn: string;
  amount: string;
  status: string;
  confidence: number;
  raw: string;
};

const TXN_PATTERNS = [
  /(?:UTR|UTR\s*No|Ref(?:erence)?(?:\s*No)?|Transaction\s*(?:ID|No|Ref)|UPI\s*(?:Ref|Transaction|Txn)[^\dA-Z]{0,10})(?:[:#\-])?\s*([A-Z0-9]{10,22})/i,
  /\b(\d{12})\b/,
  /\b([A-Z]{1,4}\d{8,16})\b/,
  /\b(\d{10,14})\b/,
];

export function extractPaymentInfo(text: string): OcrResult {
  const raw = (text || '').slice(0, 4000);
  const upper = raw.toUpperCase();
  let txn = '';
  for (const re of TXN_PATTERNS) {
    const m = raw.match(re);
    if (m && m[1]) { txn = m[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (txn.length >= 6) break; else txn=''; }
  }
  let amount = '';
  const am = raw.match(/(?:₹|RS\.?|INR|AMOUNT)[^\d]{0,8}([\d,]+\.?\d{0,2})/i) || raw.match(/₹\s*([\d,]+\.?\d{0,2})/);
  if (am) amount = am[1].replace(/,/g, '');
  let status = 'Not Detected';
  if (/SUCCESS|SUCCESSFUL|PAID|COMPLETED|PAYMENT SUCCESS/i.test(raw)) status = 'SUCCESS (detected)';
  else if (/PENDING|PROCESSING/i.test(raw)) status = 'PENDING (detected)';
  else if (/FAILED|FAILURE/i.test(raw)) status = 'FAILED (detected)';
  return { txn, amount, status, confidence: txn ? 0.72 : 0.2, raw };
}

export async function ocrImageBuffer(buf: Buffer): Promise<OcrResult> {
  // Try cloud OCR.space if key configured (better for screenshots), else local tesseract.js
  const key = process.env.OCRSPACE_API_KEY;
  if (key) {
    try {
      const fd = new FormData();
      fd.append('apikey', key);
      fd.append('language', 'eng');
      fd.append('isOverlayRequired', 'false');
      fd.append('OCREngine', '2');
      fd.append('file', new Blob([new Uint8Array(buf)], { type: 'image/png' }), 'pay.png');
      const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: fd });
      const j: any = await r.json();
      const txt = j?.ParsedResults?.[0]?.ParsedText || '';
      if (txt) { const e = extractPaymentInfo(txt); e.confidence = 0.85; return e; }
    } catch {}
  }
  try {
    const { createWorker } = await import('tesseract.js');
    const worker: any = await createWorker('eng');
    const b64 = `data:image/png;base64,${buf.toString('base64')}`;
    const { data }: any = await worker.recognize(b64);
    await worker.terminate();
    const e = extractPaymentInfo(String(data?.text || ''));
    e.confidence = typeof data?.confidence === 'number' ? data.confidence / 100 : e.confidence;
    return e;
  } catch {
    return { txn: '', amount: '', status: 'Not Detected', confidence: 0, raw: '' };
  }
}
