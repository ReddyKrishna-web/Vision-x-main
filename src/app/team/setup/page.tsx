'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui';
import { FormError, PASSWORD_HINT, PasswordField, TeamShell } from '../_components';

type Lookup = { teamName: string; passwordCreated: boolean; emailHint?: string; phoneHint?: string };

function Inner() {
  const preset = useSearchParams().get('id') || '';
  const [teamId, setTeamId] = useState(preset);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ teamName: string; registrationId: string } | null>(null);

  useEffect(() => { if (preset) setTeamId(preset); }, [preset]);

  async function find(e?: any) {
    e?.preventDefault();
    setErr('');
    if (!teamId.trim()) { setErr('Please enter your Team ID.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/team/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: teamId.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'We could not find a registered team with this Team ID.'); return; }
      setLookup(j);
    } finally {
      setBusy(false);
    }
  }

  async function create(e: any) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/team/setup-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: teamId.trim(),
          leaderEmail: leaderEmail.trim(),
          leaderPhone: leaderPhone.trim(),
          newPassword: pw,
          confirmPassword: pw2,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Could not create the password. Please try again.'); return; }
      setDone({ teamName: j.teamName, registrationId: j.registrationId });
      try { localStorage.removeItem('vx-register-draft'); } catch {}
    } finally {
      setBusy(false);
    }
  }

  // ---- Success screen: identity only, password never displayed ----
  if (done) {
    return (
      <TeamShell eyebrow="Vision X 2026 · Password ready" title="Registration successful 🎉">
        <div className="text-center">
          <svg className="check-draw mx-auto h-20 w-20" viewBox="0 0 64 64" fill="none" aria-hidden>
            <circle cx="32" cy="32" r="29" stroke="#1E9E6A" strokeWidth="4" />
            <path d="M21 33l8 8 14-16" stroke="#1E9E6A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">Your Team Dashboard credentials are ready.</p>
        </div>
        <dl className="mt-5 space-y-0 overflow-hidden rounded-2xl border border-ink/[0.07] text-[15px]">
          {[
            ['Team name', done.teamName],
            ['Project ID', done.registrationId],
            ['Password', 'Password Status: Created Successfully'],
          ].map(([k, v], i) => (
            <div key={k} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${i % 2 ? 'bg-white' : 'bg-paper/60'}`}>
              <dt className="w-28 shrink-0 font-mono text-xs uppercase tracking-wider text-ink-muted">{k}</dt>
              <dd className={`font-bold ${k === 'Project ID' ? 'font-mono' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4"><Alert kind="ok">Please keep your Team ID safe. You can now use your Team ID and password to access your dashboard.</Alert></div>
        <Link href="/team/login" className="btn-primary mt-4 w-full !py-3">Go to Team Login <span className="arr">→</span></Link>
      </TeamShell>
    );
  }

  return (
    <TeamShell
      eyebrow="Vision X 2026 · First-time setup"
      title="Create your team password 🔐"
      sub="One-time setup by the team leader. Your password is stored securely and never shown again."
    >
      <FormError msg={err} />
      {!lookup || lookup.passwordCreated ? (
        <form onSubmit={find} className="space-y-4">
          {lookup?.passwordCreated && (
            <div className="mb-1"><Alert kind="warn">A password has already been created for this team. Please log in or use Forgot Password.</Alert></div>
          )}
          <div>
            <label className="label" htmlFor="setup-id">Team ID / Project ID</label>
            <input id="setup-id" className="input font-mono" placeholder="e.g. VX2026-0001" value={teamId} onChange={(e) => setTeamId(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Checking…' : <>Find my team <span className="arr">→</span></>}</button>
          <p className="text-center text-sm text-ink-soft">Already have a password? <Link href="/team/login" className="link">Log in</Link></p>
        </form>
      ) : (
        <div>
          <div className="rounded-2xl border border-ink/[0.07] bg-paper/70 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Team</span>
              <span className="font-bold">{lookup.teamName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
              <span className="text-ink-muted">Team ID</span>
              <span className="font-mono font-bold">{teamId.trim()}</span>
            </div>
          </div>
          <form onSubmit={create} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="setup-email">Registered leader email</label>
              <input id="setup-email" className="input" type="email" autoComplete="email" placeholder={lookup.emailHint || 'leader@college.edu'} value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} />
              {lookup.emailHint && <p className="hint">Hint: {lookup.emailHint}</p>}
            </div>
            <div>
              <label className="label" htmlFor="setup-phone">Registered leader phone</label>
              <input id="setup-phone" className="input" inputMode="numeric" autoComplete="tel" placeholder={lookup.phoneHint ? `ending ${lookup.phoneHint.slice(-4)}` : '10-digit mobile number'} value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} />
              {lookup.phoneHint && <p className="hint">Hint: {lookup.phoneHint}</p>}
            </div>
            <PasswordField id="setup-pw" label="New password" value={pw} onChange={setPw} autoComplete="new-password" placeholder="Create a strong password" />
            <PasswordField id="setup-pw2" label="Confirm password" value={pw2} onChange={setPw2} autoComplete="new-password" placeholder="Repeat the password" />
            <p className="hint">{PASSWORD_HINT}</p>
            <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Creating…' : 'Create password'}</button>
            <button type="button" className="btn-ghost w-full" onClick={() => { setLookup(null); setErr(''); }}>← Use a different Team ID</button>
          </form>
        </div>
      )}
    </TeamShell>
  );
}

export default function TeamSetupPage() {
  return <Suspense><Inner /></Suspense>;
}
