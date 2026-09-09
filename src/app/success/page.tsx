'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PixelGhost, StatusBadge } from '@/components/ui';

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
      <div className="card enter !p-8 text-center sm:!p-10">
        {confirmed ? (
          <svg className="check-draw mx-auto h-14 w-14" viewBox="0 0 64 64" fill="none" aria-hidden>
            <circle cx="32" cy="32" r="29" stroke="#55D68A" strokeWidth="3" />
            <path d="M21 33l8 8 14-16" stroke="#55D68A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <PixelGhost className="mx-auto h-10 w-10 opacity-80" />
        )}
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {confirmed ? "You're registered." : underReview ? "We're checking your payment." : 'Thanks — we got it.'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate-400">
          {confirmed
            ? 'Your spot is confirmed. Bring your college ID on event day — and keep your registration ID handy.'
            : 'This usually takes only a few moments. You can safely close this page; your registration ID below stays valid.'}
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-lg bg-white/5 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Registration ID</span>
            <span className="font-mono font-bold">{id}</span>
          </div>
          {st?.registration && (
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
              <span className="text-slate-500">Team</span>
              <span className="font-medium">{st.registration.team_name}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
            <span className="text-slate-500">Payment</span>
            {payStatus ? <StatusBadge status={payStatus} /> : <span className="text-slate-500">—</span>}
          </div>
        </div>
        <div className="no-print mt-6 flex justify-center gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>Print receipt</button>
          <a href="/" className="btn-primary">Back to home</a>
        </div>
      </div>
    </div>
  );
}
export default function SuccessPage() { return <Suspense><Inner /></Suspense>; }
