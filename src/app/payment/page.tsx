'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, PxLoader } from '@/components/ui';
import { YEAR_OPTIONS } from '@/lib/validators';

const SHOT_MAX_BYTES = Math.round(2.5 * 1024 * 1024);

export default function PaymentPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<any>(null);
  const [form, setForm] = useState<any>({ teamName: '', teamSize: 2, leaderName: '', leaderEmail: '', leaderPhone: '' });
  const [members, setMembers] = useState<any[]>([{ name: '', rollNumber: '', email: '' }, { name: '', rollNumber: '', email: '' }]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [shot, setShot] = useState('');
  const [shotName, setShotName] = useState('');
  const [proofBusy, setProofBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOk, setQrOk] = useState(true);
  const [qrTs] = useState(() => Date.now());

  useEffect(() => {
    fetch('/api/payments/config').then((r) => r.json()).then(setCfg).catch(() => {});
    // Resume mode: /payment?id=REGID (e.g. coming from the register wizard).
    try {
      const id = new URLSearchParams(window.location.search).get('id') || '';
      if (!id) return;
      fetch('/api/payments/status?registrationId=' + encodeURIComponent(id))
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.registration) {
            setReg({
              registrationId: j.registration.registration_id,
              amount: j.payment?.amount ?? j.registration.fee ?? null,
              teamName: j.registration.team_name,
              status: j.payment?.payment_status || '',
            });
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });
  const setSize = (n: number) => {
    setForm({ ...form, teamSize: n });
    setMembers(Array.from({ length: n }, (_, i) => members[i] || { name: '', rollNumber: '', email: '' }));
  };
  const setM = (i: number, k: string, v: string) => {
    const c = [...members]; c[i] = { ...c[i], [k]: v }; setMembers(c);
  };

  // Step 1: save registration, then show the UPI payment panel.
  async function startPayment() {
    setErr('');
    if (!form.teamName || !form.leaderName || !form.leaderEmail || !form.leaderPhone) {
      setErr('Please fill in the team name and leader details first.'); return;
    }
    if (!form.college || String(form.college).trim().length < 2 || !form.department || String(form.department).trim().length < 2 || !(YEAR_OPTIONS as readonly string[]).includes(String(form.year || ''))) {
      setErr('Please fill in the leader’s college, department, and academic year.'); return;
    }
    for (let i = 0; i < members.length; i++) {
      const m = members[i] || {};
      if (!m.name || !m.rollNumber || !m.email) { setErr(`Complete Member ${i + 1} (name, roll number, email).`); return; }
      if (!m.college || String(m.college).trim().length < 2 || !m.department || String(m.department).trim().length < 2 || !(YEAR_OPTIONS as readonly string[]).includes(String(m.year || ''))) {
        setErr(`Please fill in Member ${i + 1}’s college, department, and academic year.`); return;
      }
    }
    setBusy(true);
    try {
      const r = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: { ...form, teamSize: Number(form.teamSize) }, members, consent: true }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'We could not start your payment. Please try again.'); return; }
      setReg(j);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErr('Something went wrong on our side. Please try again.');
    } finally { setBusy(false); }
  }

  function onShotFile(f: File | undefined) {
    setErr('');
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) { setErr('Screenshot must be a PNG or JPG image.'); return; }
    if (f.size > SHOT_MAX_BYTES) { setErr('Screenshot must be under 2.5 MB.'); return; }
    const rd = new FileReader();
    rd.onload = () => { setShot(String(rd.result || '')); setShotName(f.name); };
    rd.onerror = () => setErr('Could not read that image. Please try another.');
    rd.readAsDataURL(f);
  }

  async function copyUpi() {
    const id = cfg?.upiId || '';
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = id; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Step 2: submit the UTR proof. This records a claim — an admin verifies it,
  // and the receipt page tracks the status until then.
  async function submitProof() {
    setErr('');
    if (!utr.trim()) { setErr('Enter the UPI transaction reference (UTR / UPI Ref No.) from your payment app.'); return; }
    setProofBusy(true);
    try {
      const r = await fetch('/api/payments/submit-proof', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: reg.registrationId, utr: utr.trim(), ...(shot ? { screenshot: shot } : {}) }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Could not submit payment proof. Please try again.'); return; }
      router.push('/success?id=' + reg.registrationId);
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally { setProofBusy(false); }
  }

  const amount = reg?.amount ?? cfg?.fee ?? '…';
  const alreadyIn = reg && ['REVIEW_REQUIRED', 'VERIFYING', 'CONFIRMED', 'VERIFIED'].includes(String(reg.status || ''));

  return (
    <div className="enter mx-auto max-w-2xl pt-10">
      <div className="text-center">
        <p className="eyebrow justify-center">UPI payment</p>
        <h1 className="page-title mt-2 !text-4xl">Payment 💳</h1>
        <p className="page-sub mx-auto max-w-md">Pay with any UPI app, then submit your transaction reference below. Your spot is confirmed after our team verifies it.</p>
      </div>
      {err && <div className="mt-4"><Alert kind="error">{err}</Alert></div>}
      {busy && <div className="card-flat mt-4" role="status"><PxLoader label="Saving your registration…" /></div>}

      {!reg && (
        <div className="card mt-5">
          <h2 className="font-display text-xl font-bold tracking-tight">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="p-team">Team name</label><input id="p-team" className="input" value={form.teamName} onChange={(e) => set('teamName', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-size">Team size</label><select id="p-size" className="input" value={form.teamSize} onChange={(e) => setSize(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'member' : 'members'}</option>)}</select></div>
            <div><label className="label" htmlFor="p-leader">Team leader name</label><input id="p-leader" className="input" value={form.leaderName} onChange={(e) => set('leaderName', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-email">Leader email</label><input id="p-email" className="input" type="email" value={form.leaderEmail} onChange={(e) => set('leaderEmail', e.target.value)} /></div>
            <div className="sm:col-span-2 sm:max-w-[50%]"><label className="label" htmlFor="p-phone">Leader phone</label><input id="p-phone" className="input" inputMode="numeric" value={form.leaderPhone} onChange={(e) => set('leaderPhone', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-college">Leader college</label><input id="p-college" className="input" placeholder="College name" value={form.college || ''} onChange={(e) => set('college', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-dept">Leader department</label><input id="p-dept" className="input" placeholder="e.g. Computer Science" value={form.department || ''} onChange={(e) => set('department', e.target.value)} /></div>
            <div className="sm:max-w-[50%]"><label className="label" htmlFor="p-year">Leader academic year</label><select id="p-year" className="input" value={form.year || ''} onChange={(e) => set('year', e.target.value)}><option value="">Select…</option>{YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>

          <h2 className="font-display mt-6 text-xl font-bold tracking-tight">Members</h2>
          <div className="mt-3 space-y-3">
            {members.map((m, i) => (
              <div key={i} className="grid gap-3 rounded-2xl border border-ink/10 bg-paper/60 p-3 sm:grid-cols-3">
                <input aria-label={`Member ${i + 1} name`} className="input" placeholder={`Member ${i + 1} name`} value={m.name} onChange={(e) => setM(i, 'name', e.target.value)} />
                <input aria-label="Roll number" className="input" placeholder="Roll number" value={m.rollNumber} onChange={(e) => setM(i, 'rollNumber', e.target.value)} />
                <input aria-label="Email" className="input" placeholder="Email" value={m.email} onChange={(e) => setM(i, 'email', e.target.value)} />
                <input aria-label="College" className="input" placeholder="College" value={m.college || ''} onChange={(e) => setM(i, 'college', e.target.value)} />
                <input aria-label="Department" className="input" placeholder="Department" value={m.department || ''} onChange={(e) => setM(i, 'department', e.target.value)} />
                <select aria-label="Academic year" className="input" value={m.year || ''} onChange={(e) => setM(i, 'year', e.target.value)}><option value="">Year…</option>{YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-sm text-white">
            <span className="text-white/60">Total due</span>
            <span className="font-display text-2xl font-bold">₹{cfg?.fee ?? '…'}</span>
          </div>
          {cfg && !cfg.configured && (
            <div className="mt-3"><Alert kind="warn">UPI payment is not enabled yet. Please try again later.</Alert></div>
          )}
          <button className="btn-violet mt-4 w-full !py-4 text-base" disabled={busy || (cfg && !cfg.configured)} onClick={startPayment}>
            {busy ? 'Saving…' : <>Save & continue to payment <span className="arr">→</span></>}
          </button>
          <p className="hint mt-2 text-center">You&apos;ll pay on the next screen by scanning our UPI QR with any UPI app. 🔒</p>
        </div>
      )}

      {reg && (
        <div className="card mt-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-2xl" aria-hidden>📱</div>
          <h2 className="font-display mt-3 text-center text-2xl font-bold">Pay ₹{amount} with any UPI app</h2>
          <p className="page-sub text-center">Registration <span className="rounded-lg bg-ink px-2 py-0.5 font-mono text-[12px] font-bold text-white">{reg.registrationId}</span>{reg.teamName ? <> · {reg.teamName}</> : null}</p>

          {qrOk ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/payment-qr?ts=${qrTs}`}
              alt="UPI QR code for Vision X 2026 entry fee"
              className="mx-auto mt-5 h-64 w-64 rounded-2xl border border-ink/[0.07] bg-white object-contain p-2"
              onError={() => setQrOk(false)}
            />
          ) : (
            <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-ink/[0.07] bg-paper/60 px-5 py-6 text-center text-sm text-ink-soft">
              The QR image is unavailable right now. Please pay directly to the UPI ID below and continue.
            </div>
          )}

          <div className="mx-auto mt-4 flex max-w-sm items-center justify-between gap-2 rounded-2xl bg-paper/70 px-4 py-3">
            <div className="min-w-0">
              <p className="meta">UPI ID</p>
              <p className="truncate font-mono text-[15px] font-bold">{cfg?.upiId || '…'}</p>
            </div>
            <button className="btn-ghost shrink-0 !px-4 !py-2 text-sm" onClick={copyUpi} disabled={!cfg?.upiId}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3" role="note" aria-live="polite">
            <p className="text-sm font-semibold leading-relaxed text-danger">
              Important Note: The name shown during the UPI payment may appear as <span className="font-bold">Medical Agencies</span>. Please do not panic; this is expected. You may continue with the transaction safely.
            </p>
          </div>

          {alreadyIn ? (
            <div className="mt-5 text-center">
              <Alert kind="warn">We already have a payment proof for this registration — it&apos;s under review.</Alert>
              <button className="btn-primary mt-3 w-full !py-3.5" onClick={() => router.push('/success?id=' + reg.registrationId)}>Check status →</button>
            </div>
          ) : (
            <div className="mx-auto mt-5 max-w-sm">
              <label className="label" htmlFor="p-utr">UPI transaction reference (UTR / UPI Ref No.)</label>
              <input
                id="p-utr"
                className="input font-mono"
                placeholder="e.g. 412345678901"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                inputMode="text"
                autoComplete="off"
              />
              <p className="hint mt-1">Find it in your UPI app&apos;s payment history after paying.</p>

              <label className="label mt-4" htmlFor="p-shot">Payment screenshot <span className="font-normal text-ink-muted">(optional)</span></label>
              <input
                id="p-shot"
                type="file"
                accept="image/png,image/jpeg"
                className="input"
                onChange={(e) => onShotFile(e.target.files?.[0])}
              />
              {shotName && (
                <p className="hint mt-1">Attached: {shotName} <button className="link" onClick={() => { setShot(''); setShotName(''); }}>remove</button></p>
              )}

              <button className="btn-violet mt-4 w-full !py-4 text-base" disabled={proofBusy} onClick={submitProof}>
                {proofBusy ? 'Submitting…' : <>I&apos;ve paid — submit proof <span className="arr">→</span></>}
              </button>
              <p className="hint mt-2 text-center">Submitting records your claim only. Our team verifies it, then your spot is confirmed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
