'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentSettingsPage() {
  const [upiId, setUpiId] = useState('');
  const [savedUpi, setSavedUpi] = useState('');
  const [hasQr, setHasQr] = useState(false);
  const [qrTs, setQrTs] = useState(Date.now());
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const r = await fetch('/api/admin/payment-settings');
    if (!r.ok) return;
    const j = await r.json();
    setUpiId(j.upiId || '');
    setSavedUpi(j.upiId || '');
    setHasQr(!!j.hasQr);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function saveUpi() {
    setMsg(''); setSaving(true);
    try {
      const r = await fetch('/api/admin/payment-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: upiId.trim() }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || 'Could not save the UPI ID.'); return; }
      setSavedUpi(j.upiId);
      setMsg('UPI ID saved — the payment page shows it immediately.');
    } finally { setSaving(false); }
  }

  async function uploadQr(f: File | undefined) {
    if (!f) return;
    setMsg('');
    if (!/^image\/(png|jpeg)$/.test(f.type)) { setMsg('QR image must be a PNG or JPG file.'); return; }
    if (f.size > 3 * 1024 * 1024) { setMsg('QR image must be under 3 MB.'); return; }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const rd = new FileReader();
        rd.onload = () => resolve(String(rd.result || ''));
        rd.onerror = () => reject(new Error('read'));
        rd.readAsDataURL(f);
      });
      const r = await fetch('/api/admin/payment-settings/qr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || 'Could not upload the QR image — the current one is still active.'); return; }
      setHasQr(true);
      setQrTs(Date.now());
      setMsg('QR image updated — the payment page shows it immediately.');
    } catch {
      setMsg('Could not read that file. Please try another image.');
    } finally { setUploading(false); }
  }

  return (
    <div className="enter mx-auto max-w-3xl pt-10">
      <p className="page-sub"><Link href="/admin/dashboard" className="link">← Dashboard</Link></p>
      <h1 className="page-title mt-1">Payment Settings</h1>
      <p className="page-sub">Teams pay by scanning this QR in their own UPI app. Changes here appear on the payment page instantly — existing registrations are never affected.</p>

      <div className="card mt-5">
        <h2 className="section-title">UPI ID</h2>
        <p className="page-sub">Shown under the QR on the payment page, with a copy button.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="UPI ID"
            className="input flex-1 font-mono"
            placeholder="example@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn-primary sm:!px-6" disabled={saving} onClick={saveUpi}>
            {saving ? 'Saving…' : 'Save UPI ID'}
          </button>
        </div>
        {savedUpi && <p className="hint mt-2">Currently active: <span className="font-mono font-bold text-ink">{savedUpi}</span></p>}
      </div>

      <div className="card mt-4">
        <h2 className="section-title">UPI QR image</h2>
        <p className="page-sub">PNG or JPG, under 3 MB. Uploading a new image safely replaces the current one — the old QR stays live until the new one is saved.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-start">
          <div className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white">
            {hasQr ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={`/api/payment-qr?ts=${qrTs}`} alt="Active UPI QR code" className="h-52 w-full object-contain p-2" />
            ) : (
              <p className="px-4 py-10 text-center text-sm text-ink-muted">No QR uploaded yet.</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="qr-file">Upload replacement QR</label>
            <input
              id="qr-file"
              type="file"
              accept="image/png,image/jpeg"
              className="input"
              disabled={uploading}
              onChange={(e) => { void uploadQr(e.target.files?.[0]); e.target.value = ''; }}
            />
            <p className="hint mt-2">After upload, open the <Link href="/payment" className="link">payment page</Link> to confirm the new QR scans correctly.</p>
          </div>
        </div>
      </div>

      {msg && (
        <p className={`mt-4 text-sm font-medium ${msg.startsWith('UPI ID saved') || msg.startsWith('QR image updated') ? 'text-mint' : 'text-danger'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
