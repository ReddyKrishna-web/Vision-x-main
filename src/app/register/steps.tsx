'use client';
import { Alert } from '@/components/ui';
import { YEAR_OPTIONS } from '@/lib/validators';

export function MembersStep({ members, onChange, onBack, onNext }: any) {
  return (
    <div className="mt-5 space-y-4">
      <div className="card !bg-violet-50/60">
        <h2 className="font-display text-xl font-bold tracking-tight">Who&apos;s on the team? 🧑‍🤝‍🧑</h2>
        <p className="page-sub">Include the leader as member 1 if they&apos;re participating. Roll numbers must be unique.</p>
      </div>
      {members.map((m: any, i: number) => (
        <fieldset key={i} className="card">
          <legend className="rounded-full bg-ink px-3 py-1 font-mono text-xs font-bold text-white">Member {i + 1}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor={`m${i}-name`}>Full name</label><input id={`m${i}-name`} className="input" placeholder={`Member ${i + 1} full name`} value={m.name || ''} onChange={e => onChange(i, 'name', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-roll`}>Roll number</label><input id={`m${i}-roll`} className="input" placeholder="e.g. 22CS042" value={m.rollNumber || ''} onChange={e => onChange(i, 'rollNumber', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-email`}>Email</label><input id={`m${i}-email`} className="input" type="email" placeholder="member@college.edu" value={m.email || ''} onChange={e => onChange(i, 'email', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-college`}>College</label><input id={`m${i}-college`} className="input" placeholder="College name" value={m.college || ''} onChange={e => onChange(i, 'college', e.target.value)} /></div>
            <div><label className="label" htmlFor={`m${i}-dept`}>Department</label><input id={`m${i}-dept`} className="input" placeholder="e.g. Computer Science" value={m.department || ''} onChange={e => onChange(i, 'department', e.target.value)} /></div>
            <div className="sm:col-span-2 sm:max-w-[50%]"><label className="label" htmlFor={`m${i}-year`}>Academic year</label><select id={`m${i}-year`} className="input" value={m.year || ''} onChange={e => onChange(i, 'year', e.target.value)}><option value="">Select…</option>{YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row"><button className="btn-ghost sm:!px-8" onClick={onBack}>← Back</button><button className="btn-primary flex-1 sm:flex-none sm:!px-8" onClick={onNext}>Review & pay <span className="arr">→</span></button></div>
    </div>
  );
}

export function PayStep({ cfg, team, members, busy, consent, setConsent, onPay, onBack, err }: any) {
  const gatewayDown = cfg && cfg.paymentsConfigured === false;
  return (
    <div className="card mt-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Almost there 💳</h2>
          <p className="page-sub">Pay securely with UPI on the next screen. Your spot is confirmed after our team verifies it.</p>
        </div>
        <span className="rounded-2xl bg-lime px-4 py-2 text-center font-display text-lg font-bold leading-none">Rs.{cfg?.fee}<br /><span className="font-mono text-[10px] font-normal">INR total</span></span>
      </div>
      <dl className="mt-5 space-y-0 overflow-hidden rounded-2xl border border-ink/[0.07] text-[15px]">
        {[
          ['Team', `${team.teamName} (${team.teamSize} ${Number(team.teamSize) === 1 ? 'member' : 'members'})`],
          ['Leader', `${team.leaderName} · ${team.leaderEmail} · ${team.leaderPhone}`],
          ['Members', (members || []).map((m: any) => m.name).filter(Boolean).join(', ') || '—'],
        ].map(([k, v], i) => (
          <div key={k} className={`flex gap-3 px-4 py-3 ${i % 2 ? 'bg-white' : 'bg-paper/60'}`}>
            <dt className="w-20 shrink-0 font-mono text-xs uppercase tracking-wider text-ink-muted pt-0.5">{k}</dt>
            <dd className="font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-paper/70 p-4 text-sm text-ink-soft">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-accent" />
        <span>I&apos;ve checked the details above and agree to be contacted about Vision X 2026.</span>
      </label>
      {err && <div className="mt-3"><Alert kind="error">{err}</Alert></div>}
      {gatewayDown && (
        <div className="mt-3"><Alert kind="warn">UPI payment isn&apos;t enabled yet. Your details above are saved in this browser — please try again once payments are enabled.</Alert></div>
      )}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button className="btn-ghost sm:!px-8" onClick={onBack}>← Back</button>
        <button className="btn-violet flex-1 !py-4 text-base" disabled={!consent || busy || gatewayDown} onClick={onPay}>{busy ? 'Saving registration…' : <>Save & continue to payment <span className="arr">→</span></>}</button>
      </div>
      <p className="hint mt-3 text-center">Next: scan our UPI QR with any UPI app and submit your transaction reference. 🔒 This site never sees your UPI PIN.</p>
    </div>
  );
}
