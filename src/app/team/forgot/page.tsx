'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui';
import { FormError, PASSWORD_HINT, PasswordField, TeamShell } from '../_components';

export default function TeamForgotPage() {
  const [teamId, setTeamId] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function verify(e: any) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/team/forgot-verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: teamId.trim(), leaderEmail: leaderEmail.trim(), leaderPhone: leaderPhone.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Could not verify. Please try again.'); return; }
      setResetToken(j.resetToken);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: any) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/team/forgot-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: pw, confirmPassword: pw2 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) { setResetToken(''); }
        setErr(j.error || 'Could not update the password. Please try again.');
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <TeamShell eyebrow="Vision X 2026 · Password updated" title="All set ✅">
        <Alert kind="ok">Your team password has been updated. Please log in again with your Team ID and new password.</Alert>
        <Link href="/team/login" className="btn-primary mt-4 w-full !py-3">Back to Team Login <span className="arr">→</span></Link>
      </TeamShell>
    );
  }

  return (
    <TeamShell
      eyebrow="Vision X 2026 · Forgot password"
      title={resetToken ? 'Create a new password 🔑' : 'Reset your password 📩'}
      sub={resetToken ? 'Choose a new team password below.' : 'We’ll verify you’re the registered team leader first.'}
    >
      <FormError msg={err} />
      {!resetToken ? (
        <form onSubmit={verify} className="space-y-4">
          <div>
            <label className="label" htmlFor="fg-id">Team ID / Project ID</label>
            <input id="fg-id" className="input font-mono" placeholder="e.g. VX2026-0001" value={teamId} onChange={(e) => setTeamId(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="fg-email">Registered leader email</label>
            <input id="fg-email" className="input" type="email" autoComplete="email" placeholder="leader@college.edu" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="fg-phone">Registered leader phone</label>
            <input id="fg-phone" className="input" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Verifying…' : <>Verify me <span className="arr">→</span></>}</button>
          <p className="text-center text-sm text-ink-soft">Remembered it? <Link href="/team/login" className="link">Log in</Link></p>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <PasswordField id="fg-pw" label="New password" value={pw} onChange={setPw} autoComplete="new-password" placeholder="Create a strong password" />
          <PasswordField id="fg-pw2" label="Confirm password" value={pw2} onChange={setPw2} autoComplete="new-password" placeholder="Repeat the password" />
          <p className="hint">{PASSWORD_HINT}</p>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </TeamShell>
  );
}
