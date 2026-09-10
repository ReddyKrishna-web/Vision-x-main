'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KEY, loadDraft, emailOk, phoneOk, type Draft } from './draft';

export function useRegister() {
  const router = useRouter();
  const [cfg, setCfg] = useState<any>(null);
  const [d, setD] = useState<Draft>({ step: 0, team: {}, members: [], pay: {} });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    setD(loadDraft());
    fetch('/api/settings').then(r => r.json()).then(setCfg).catch(() => {});
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }, [d]);
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });
  function validTeam() {
    const t = d.team;
    if (!t.teamName || t.teamName.trim().length < 3) return 'Please enter a valid team name.';
    if (!t.leaderName || t.leaderName.trim().length < 3) return 'Please enter leader full name.';
    if (!emailOk(t.leaderEmail)) return 'Please enter a valid email.';
    if (!phoneOk(t.leaderPhone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (!t.teamSize) return 'Select team size.';
    return '';
  }
  function validMembers() {
    const n = Number(d.team.teamSize || 0);
    if (d.members.length !== n) return 'Please complete all team member details.';
    const rolls = new Set<string>();
    for (let i = 0; i < n; i++) {
      const m = d.members[i] || {};
      if (!m.name || !m.rollNumber || !emailOk(m.email)) return 'Complete Member ' + (i + 1) + ' (name, roll number, email).';
      const r = String(m.rollNumber).toLowerCase();
      if (rolls.has(r)) return 'Roll numbers must be unique within a team.';
      rolls.add(r);
    }
    return '';
  }
  // Submit registration -> server creates PENDING_PAYMENT + Razorpay order -> checkout.
  async function pay() {
    setErr('');
    const a = validTeam(); if (a) { setErr(a); return; }
    const b = validMembers(); if (b) { setErr(b); return; }
    if (!consent) { setErr('Please accept the consent checkbox.'); return; }
    if (cfg && cfg.paymentsConfigured === false) {
      setErr('Online payment isn’t enabled yet. Please try again once payments are enabled.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: { ...d.team, teamSize: Number(d.team.teamSize) }, members: d.members, consent: true }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Could not start payment. Please try again.'); return; }
      try { localStorage.removeItem(KEY); } catch {}
      await openCheckout(j);
    } finally { setBusy(false); }
  }
  async function openCheckout(ord: any) {
    setErr('');
    try {
      await loadRazorpayScript();
      const Rzp: any = (window as any).Razorpay;
      if (!Rzp || !ord?.checkout?.orderId || !ord?.checkout?.keyId) throw new Error('Checkout unavailable');
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
        modal: { ondismiss: () => { router.push('/success?id=' + ord.registrationId); } },
        handler: (resp: any) => { void verify(ord, resp); },
      });
      rzp.on('payment.failed', () => {
        setErr('Payment could not be completed. No money was confirmed — use “Try again” on the next screen.');
        router.push('/success?id=' + ord.registrationId);
      });
      rzp.open();
    } catch {
      setErr('The secure checkout could not open. Your registration is saved — please try again.');
    }
  }
  async function verify(ord: any, resp: any) {
    setBusy(true);
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
      if (!r.ok && j.status !== 'PENDING' && j.status !== 'FAILED') {
        setErr(j.error || 'Verification hit a snag. Your registration is saved — check its status.');
        return;
      }
      router.push('/success?id=' + ord.registrationId);
    } finally { setBusy(false); }
  }
  return { cfg, d, setD, set, err, setErr, busy, consent, setConsent, validTeam, validMembers, pay };
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
