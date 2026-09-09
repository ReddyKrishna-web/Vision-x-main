'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@visionx.hack');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function go(e: any) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!r.ok) { setErr('That email and password did not match. Please try again.'); return; }
      router.push('/admin/dashboard');
    } finally { setBusy(false); }
  }
  return (
    <div className="mx-auto max-w-sm pt-16">
      <div className="text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-accent px-corners font-mono text-base text-ink">X</span>
        <h1 className="page-title mt-4">Admin sign in</h1>
        <p className="page-sub">Manage registrations, payments, and event data.</p>
      </div>
      <div className="card mt-6">
        {err && <div className="mb-4"><Alert kind="error">{err}</Alert></div>}
        <form onSubmit={go} className="space-y-4">
          <div><label className="label" htmlFor="a-email">Email</label><input id="a-email" className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="label" htmlFor="a-pass">Password</label><input id="a-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
