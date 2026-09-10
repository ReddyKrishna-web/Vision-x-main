'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui';

type Status = { registration?: any; payment?: any };

function Inner() {
  const id = useSearchParams().get('id') || '';
  const [st, setSt] = useState<Status | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const poll = () =>
      fetch('/api/payments/status?registrationId=' + encodeURIComponent(id))
        .then((r) => r.json())
        .then((j) => { if (alive && !j.error) setSt(j); })
        .catch(() => {});
    poll();
    const t = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  const regStatus = st?.registration?.registration_status || '';
  const payStatus = st?.payment?.payment_status || '';
  const confirmed = regStatus === 'CONFIRMED' || payStatus === 'CONFIRMED' || payStatus === 'VERIFIED';
  const underReview = !confirmed && (payStatus === 'REVIEW_REQUIRED' || regStatus === 'UNDER_REVIEW' || payStatus === 'PENDING');

  return (
    <div className="mx-auto max-w-xl pt-12">
      <div className="card enter relative overflow-hidden !p-8 text-center sm:!p-10">
        <div className="blob left-1/2 top-0 h-40 w-72 -translate-x-1/2 bg-accent/15" aria-hidden />
        {confirmed ? (
          <svg className="check-draw relative mx-auto h-20 w-20" viewBox="0 0 64 64" fill="none" aria-hidden>
            <circle cx="32" cy="32" r="29" stroke="#1E9E6A" strokeWidth="4" />
            <path d="M21 33l8 8 14-16" stroke="#1E9E6A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-violet-50 text-4xl" aria-hidden>
            {underReview ? '🔍' : '💌'}
          </div>
        )}
        <p className="eyebrow relative mt-5 justify-center">{confirmed ? 'Spot confirmed' : 'Received'}</p>
        <h1 className="font-display relative mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {confirmed ? "You're in. See you there! 🎉" : underReview ? "We're checking your payment." : 'Thanks — we got it.'}
        </h1>
        <p className="relative mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
          {confirmed
            ? 'Your spot is confirmed. Bring your college ID on event day — and keep your registration ID handy.'
            : 'This usually takes only a few moments. You can safely close this page; your registration ID below stays valid.'}
        </p>
        <div className="relative mx-auto mt-6 max-w-sm rounded-2xl border border-ink/[0.07] bg-paper/70 px-5 py-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">Registration ID</span>
            <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-[13px] font-bold text-white">{id}</span>
          </div>
          {st?.registration && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
              <span className="text-ink-muted">Team</span>
              <span className="font-bold">{st.registration.team_name}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
            <span className="text-ink-muted">Payment</span>
            {payStatus ? <StatusBadge status={payStatus} /> : <span className="text-ink-muted">checking…</span>}
          </div>
        </div>
        <div className="no-print relative mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print receipt</button>
          <Link href={id ? `/team/setup?id=${encodeURIComponent(id)}` : '/team/setup'} className="btn-violet">Create team password 🔐</Link>
          <Link href="/" className="btn-primary">Back to home →</Link>
        </div>
        <p className="relative mt-3 text-xs leading-relaxed text-ink-muted">
          Next step: create your team password once — then use your Registration ID + password anytime at Team Login.
        </p>
      </div>
    </div>
  );
}
export default function SuccessPage() { return <Suspense><Inner /></Suspense>; }
