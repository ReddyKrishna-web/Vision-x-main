'use client';
import { Alert } from '@/components/ui';

export function MembersStep({ members, onChange, onBack, onNext }: any) {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <h2 className="section-title">Who's on the team?</h2>
        <p className="page-sub">Include the leader as member 1 if they're participating.</p>
      </div>
      {members.map((m: any, i: number) => (
        <fieldset key={i} className="card">
          <legend className="px-1 font-mono text-xs tracking-wider text-slate-200">Member {i + 1}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor={`m${i}-name`}>Full name</label><input id={`m${i}-name`} className="input" value={m.name || ''} onChange={e => onChange(i, 'name', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-roll`}>Roll number</label><input id={`m${i}-roll`} className="input" value={m.rollNumber || ''} onChange={e => onChange(i, 'rollNumber', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-email`}>Email</label><input id={`m${i}-email`} className="input" type="email" value={m.email || ''} onChange={e => onChange(i, 'email', e.target.value)} /></div>
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2"><button className="btn-ghost" onClick={onBack}>Back</button><button className="btn-primary" onClick={onNext}>Continue to payment</button></div>
    </div>
  );
}

export function PayStep({ cfg, team, members, busy, consent, setConsent, onPay, onBack, err }: any) {
  const gatewayDown = cfg && cfg.paymentsConfigured === false;
  return (
    <div className="card mt-5">
      <h2 className="section-title">Payment — Rs.{cfg?.fee}</h2>
      <p className="page-sub">Secure online payment via Razorpay. Your spot is confirmed only after our server verifies the payment.</p>
      <dl className="mt-4 space-y-2 text-[15px]">
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Team</dt><dd className="font-medium">{team.teamName} ({team.teamSize} {Number(team.teamSize) === 1 ? 'member' : 'members'})</dd></div>
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Leader</dt><dd>{team.leaderName} · {team.leaderEmail} · {team.leaderPhone}</dd></div>
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Members</dt><dd>{(members || []).map((m: any) => m.name).filter(Boolean).join(', ') || '—'}</dd></div>
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Amount</dt><dd className="font-semibold">₹{cfg?.fee} <span className="font-normal text-slate-500">INR</span></dd></div>
      </dl>
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-slate-300">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
        <span>I've checked the details above and agree to be contacted about Vision X 2026.</span>
      </label>
      {err && <div className="mt-3"><Alert kind="error">{err}</Alert></div>}
      {gatewayDown && (
        <div className="mt-3"><Alert kind="warn">Online payment isn’t enabled yet. Your details above are saved in this browser — please try again once payments are enabled.</Alert></div>
      )}
      <div className="mt-4 flex justify-center gap-2">
        <button className="btn-ghost" onClick={onBack}>Back</button>
        <button className="btn-primary" disabled={!consent || busy || gatewayDown} onClick={onPay}>{busy ? 'Opening secure checkout…' : <>Proceed to pay <span className="arr">→</span></>}</button>
      </div>
      <p className="hint mt-2 text-center">UPI, cards, and netbanking are accepted inside the Razorpay checkout.</p>
    </div>
  );
}
