'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, StatusBadge } from '@/components/ui';

function Inner() {
  const id = useSearchParams().get('id') || '';
  const [st, setSt] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch('/api/payments/status?registrationId=' + encodeURIComponent(id))
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setErr('We could not find a registration with this ID.'); return; }
        setSt(j);
      })
      .catch(() => setErr('Verification is unavailable right now. Please try again.'));
  }, [id]);

  return (
    <div className="enter mx-auto max-w-md pt-12">
      <div className="card relative overflow-hidden !p-8 text-center">
        <div className="blob left-1/2 top-0 h-40 w-72 -translate-x-1/2 bg-accent/15" aria-hidden />
        <p className="eyebrow relative justify-center">Vision X 2026 · Check-in verification</p>
        {!id ? (
          <div className="relative mt-4"><Alert kind="warn">No registration ID was provided. Ask the team to show their dashboard QR again.</Alert></div>
        ) : err ? (
          <div className="relative mt-4"><Alert kind="error">{err}</Alert></div>
        ) : !st ? (
          <p className="relative mt-4 text-sm text-ink-muted">Verifying…</p>
        ) : (
          <div className="relative mt-4">
            <p className="font-mono text-sm font-bold">{st.registration?.registration_id}</p>
            <p className="font-display mt-1 text-2xl font-bold">{st.registration?.team_name}</p>
            <div className="mt-3 flex justify-center gap-2">
              <StatusBadge status={st.registration?.registration_status || 'PENDING'} />
              {st.payment && <StatusBadge status={st.payment.payment_status} />}
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {st.registration?.registration_status === 'CONFIRMED'
                ? '✅ Confirmed team — cleared for check-in.'
                : '⚠️ Not confirmed yet — please check with the help desk.'}
            </p>
          </div>
        )}
        <div className="relative mt-6">
          <Link href="/" className="btn-ghost text-sm">Back to home</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense><Inner /></Suspense>;
}
