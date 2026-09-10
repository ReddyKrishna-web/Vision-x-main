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
  // Submit registration -> server saves it (PENDING_PAYMENT) -> continue to
  // the UPI payment screen, where the team scans the QR and submits proof.
  async function pay() {
    setErr('');
    const a = validTeam(); if (a) { setErr(a); return; }
    const b = validMembers(); if (b) { setErr(b); return; }
    if (!consent) { setErr('Please accept the consent checkbox.'); return; }
    if (cfg && cfg.paymentsConfigured === false) {
      setErr('UPI payment isn’t enabled yet. Please try again once payments are enabled.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: { ...d.team, teamSize: Number(d.team.teamSize) }, members: d.members, consent: true }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Could not save registration. Please try again.'); return; }
      try { localStorage.removeItem(KEY); } catch {}
      router.push('/payment?id=' + j.registrationId);
    } finally { setBusy(false); }
  }
  return { cfg, d, setD, set, err, setErr, busy, consent, setConsent, validTeam, validMembers, pay };
}
