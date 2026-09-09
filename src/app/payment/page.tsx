'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, PxLoader } from '@/components/ui';

const STAGES = [
  'Preparing your payment…',
  'Creating a secure Razorpay order…',
  'Opening Razorpay Checkout…',
  'Waiting for your payment…',
  'Verifying payment with Razorpay…',
  'Checking your registration…',
  'Confirming your spot…',
];

export default function PaymentPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<any>(null);
  const [form, setForm] = useState<any>({ teamName: '', teamSize: 2, leaderName: '', leaderEmail: '', leaderPhone: '' });
  const [members, setMembers] = useState<any[]>([{ name: '', rollNumber: '', email: '' }, { name: '', rollNumber: '', email: '' }]);
  const [stage, setStage] = useState(-1);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/payments/config').then((r) => r.json()).then(setCfg).catch(() => {});
  }, []);

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });
  const setSize = (n: number) => {
    setForm({ ...form, teamSize: n });
    setMembers(Array.from({ length: n }, (_, i) => members[i] || { name: '', rollNumber: '', email: '' }));
  };
  const setM = (i: number, k: string, v: string) => {
    const c = [...members]; c[i] = { ...c[i], [k]: v }; setMembers(c);
  };

  // Step 1: validate locally, then ask OUR server for a Razorpay order.
  async function startPayment() {
    setErr('');
    if (!form.teamName || !form.leaderName || !form.leaderEmail || !form.leaderPhone) {
      setErr('Please fill in the team name and leader details first.'); return;
    }
    setBusy(true); setStage(0);
    try {
      setStage(1);
      const r = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: { ...form, teamSize: Number(form.teamSize) }, members, consent: true }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'We could not start your payment. Please try again.'); setStage(-1); return; }
      setOrder(j);
      setStage(2);
      await openRazorpayCheckout(j);
    } catch {
      setErr('Something went wrong on our side. Please try again.'); setStage(-1);
    } finally { setBusy(false); }
  }

  // Step 2: open official Razorpay Checkout with the server-issued order.
  async function openRazorpayCheckout(ord: any) {
    setErr('');
    try {
      await loadRazorpayScript();
      const Rzp: any = (window as any).Razorpay;
      if (!Rzp || !ord?.checkout?.orderId || !ord?.checkout?.keyId) {
        throw new Error('Checkout unavailable');
      }
      const c = ord.checkout;
      const rzp = new Rzp({
        key: c.keyId,
        amount: c.amountPaise,
        currency: c.currency || 'INR',
        name: 'Vision X 2026',
        description: `Team ${c.teamName} — registration fee`,
        order_id: c.orderId,
        prefill: { name: c.customerName, email: c.customerEmail, contact: c.customerPhone },
        notes: { registration_id: c.registrationId },
        theme: { color: '#8B5CF6' },
        // User closed checkout without paying: stay on retry state, never mark paid.
        modal: { ondismiss: () => { setStage(3); setErr('Payment window closed before completion. Your registration is saved — use “Try again” when ready.'); } },
        handler: (resp: any) => { void verifyRazorpay(ord, resp); },
      });
      rzp.on('payment.failed', () => {
        setStage(-1);
        setErr('Payment could not be completed. No money was confirmed — you can try again.');
      });
      rzp.open();
    } catch {
      setStage(3);
      setErr('The secure checkout could not open. Check your connection, then use “Try again”.');
    }
  }

  // Step 3: send Razorpay's response to OUR server — it alone decides truth.
  async function verifyRazorpay(ord: any, resp: any) {
    setErr(''); setBusy(true); setStage(4);
    try {
      const r = await fetch('/api/payments/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: ord.registrationId,
          paymentId: ord.paymentId,
          razorpay_order_id: resp?.razorpay_order_id,
          razorpay_payment_id: resp?.razorpay_payment_id,
          razorpay_signature: resp?.razorpay_signature,
          clientClaimedSuccess: true,
        }),
      });
      const j = await r.json();
      setStage(6);
      if (j.status === 'CONFIRMED' || j.status === 'REVIEW_REQUIRED' || j.status === 'FRAUD_BLOCKED') {
        router.push('/success?id=' + ord.registrationId);
      } else if (j.status === 'PENDING') {
        setErr('Your payment is still processing at the bank. Give it a minute, then use “Try again”.');
      } else {
        setErr(j.error || 'We could not confirm your payment yet. Your registration is saved — you can try again.');
      }
    } catch { setErr('Verification hit a snag. Please try again in a moment.'); }
    finally { setBusy(false); }
  }

  // Safe retry: fresh Razorpay order for the same saved registration.
  async function retryPayment() {
    if (!order) return;
    setErr(''); setBusy(true); setStage(1);
    try {
      const r = await fetch('/api/payments/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: order.registrationId }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j.status === 'CONFIRMED') { router.push('/success?id=' + order.registrationId); return; }
        setErr(j.error || 'Could not restart payment. Please try again.'); setStage(-1); return;
      }
      setOrder(j);
      setStage(2);
      await openRazorpayCheckout(j);
    } catch { setErr('Something went wrong. Please try again.'); setStage(-1); }
    finally { setBusy(false); }
  }

  return (
    <div className="enter mx-auto max-w-2xl pt-10">
      <h1 className="page-title">Payment</h1>
      <p className="page-sub">Your spot is confirmed only after our server verifies the payment — never on this screen alone.</p>
      {err && <div className="mt-4"><Alert kind="error">{err}</Alert></div>}
      {stage >= 0 && <div className="mt-3" role="status"><PxLoader label={STAGES[Math.min(stage, STAGES.length - 1)]} /></div>}

      {!order && (
        <div className="card mt-5">
          <h2 className="section-title">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="p-team">Team name</label><input id="p-team" className="input" value={form.teamName} onChange={(e) => set('teamName', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-size">Team size</label><select id="p-size" className="input" value={form.teamSize} onChange={(e) => setSize(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'member' : 'members'}</option>)}</select></div>
            <div><label className="label" htmlFor="p-leader">Team leader name</label><input id="p-leader" className="input" value={form.leaderName} onChange={(e) => set('leaderName', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-email">Leader email</label><input id="p-email" className="input" type="email" value={form.leaderEmail} onChange={(e) => set('leaderEmail', e.target.value)} /></div>
            <div className="sm:col-span-2 sm:max-w-[50%]"><label className="label" htmlFor="p-phone">Leader phone</label><input id="p-phone" className="input" inputMode="numeric" value={form.leaderPhone} onChange={(e) => set('leaderPhone', e.target.value)} /></div>
          </div>

          <h2 className="section-title mt-6">Members</h2>
          <div className="mt-3 space-y-3">
            {members.map((m, i) => (
              <div key={i} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-3">
                <input aria-label={`Member ${i + 1} name`} className="input" placeholder={`Member ${i + 1} name`} value={m.name} onChange={(e) => setM(i, 'name', e.target.value)} />
                <input aria-label="Roll number" className="input" placeholder="Roll number" value={m.rollNumber} onChange={(e) => setM(i, 'rollNumber', e.target.value)} />
                <input aria-label="Email" className="input" placeholder="Email" value={m.email} onChange={(e) => setM(i, 'email', e.target.value)} />
              </div>
            ))}
          </div>

          <h2 className="section-title mt-6">Payment method</h2>
          <p className="page-sub">Secure online payment via Razorpay — UPI, cards, and netbanking are accepted inside the checkout.</p>

          <div className="mt-5 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm">
            <span className="text-slate-400">Total due</span>
            <span className="text-lg font-bold">₹{cfg?.fee ?? '…'}</span>
          </div>
          {cfg && !cfg.configured && (
            <div className="mt-3"><Alert kind="warn">Online payment is not enabled yet. Please try again later.</Alert></div>
          )}
          <button className="btn-primary mt-4 w-full !py-3" disabled={busy || (cfg && !cfg.configured)} onClick={startPayment}>
            {busy ? 'Setting things up…' : <>Proceed to pay <span className="arr">→</span></>}
          </button>
          <p className="hint mt-2 text-center">The order is created on our server. card and UPI details go only to Razorpay — never to this site.</p>
        </div>
      )}

      {order && (
        <div className="card mt-5">
          <h2 className="section-title">Pay ₹{order.checkout?.amount} via Razorpay</h2>
          <p className="page-sub">Registration <span className="font-mono font-semibold text-slate-300">{order.registrationId}</span></p>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Team</dt><dd className="font-medium">{order.checkout?.teamName}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Amount</dt><dd className="font-semibold">₹{order.checkout?.amount} <span className="font-normal text-slate-500">INR</span></dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Order</dt><dd className="font-mono text-[13px]">{order.checkout?.orderId}</dd></div>
          </dl>
          <button className="btn-primary mt-4 w-full !py-3" disabled={busy} onClick={() => openRazorpayCheckout(order)}>
            {busy ? 'Opening…' : <>Open Razorpay Checkout <span className="arr">→</span></>}
          </button>
          <button className="btn-ghost mt-2 w-full" disabled={busy} onClick={retryPayment}>Try again with a fresh order</button>
          <p className="hint mt-2 text-center">Already paid and closed the window? Use “Try again” — a confirmed registration is never charged twice.</p>
        </div>
      )}
    </div>
  );
}

function loadRazorpayScript(): Promise<void> {
  const src = 'https://checkout.razorpay.com/v1/checkout.js';
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}
