'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormError, PasswordField, TeamShell } from '../_components';

export default function TeamLoginPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(e: any) {
    e.preventDefault();
    setErr('');
    if (!teamId.trim()) { setErr('Please enter your Team ID.'); return; }
    if (!password) { setErr('Please enter your team password.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/team/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: teamId.trim(), password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.passwordCreated === false) {
          router.push('/team/setup?id=' + encodeURIComponent(teamId.trim()));
          return;
        }
        setErr(j.error || 'The Team ID or password is incorrect.');
        return;
      }
      router.push('/team/dashboard');
    } finally {
      setBusy(false);
    }
  }

  return (
    <TeamShell
      eyebrow="Vision X 2026 · Team login"
      title="Welcome back, builders 👋"
      sub="Sign in with your Team ID and team password to open your dashboard."
    >
      <FormError msg={err} />
      <form onSubmit={go} className="space-y-4">
        <div>
          <label className="label" htmlFor="team-id">Team ID / Project ID</label>
          <input
            id="team-id"
            className="input font-mono"
            placeholder="e.g. VX2026-0001"
            autoComplete="username"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          />
          <p className="hint">You received this ID when your team registered.</p>
        </div>
        <PasswordField id="team-pass" label="Team password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Your team password" />
        <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
          {busy ? 'Signing in…' : <>Login to Dashboard <span className="arr">→</span></>}
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/team/forgot" className="link">Forgot password?</Link>
        <Link href="/team/setup" className="link">First time? Create password</Link>
      </div>
    </TeamShell>
  );
}
