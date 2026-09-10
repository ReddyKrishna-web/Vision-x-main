'use client';
import { YEAR_OPTIONS } from '@/lib/validators';
export function TeamStep({ t, cfg, onChange, onNext }: any) {
  return (
    <div className="card mt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">About your team ⛺</h2>
          <p className="page-sub">Start with the basics — members come next.</p>
        </div>
        <span className="hidden rounded-full bg-violet-50 px-3 py-1 font-mono text-xs text-accent-deep sm:block">step 1 / 3</span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="teamName">Team name</label><input id="teamName" className="input" placeholder="e.g. Null Pointers" value={t.teamName || ''} onChange={e => onChange({ teamName: e.target.value })} /></div>
        <div><label className="label" htmlFor="teamSize">Team size</label><select id="teamSize" className="input" value={t.teamSize || ''} onChange={e => onChange({ teamSize: Number(e.target.value) }, true)}><option value="">Select…</option>{Array.from({ length: (cfg?.maxTeam || 4) - (cfg?.minTeam || 1) + 1 }, (_, i) => (cfg?.minTeam || 1) + i).map(n => <option key={n} value={n}>{n} {n === 1 ? 'member' : 'members'}</option>)}</select></div>
        <div><label className="label" htmlFor="leaderName">Team leader name</label><input id="leaderName" className="input" placeholder="Full name" value={t.leaderName || ''} onChange={e => onChange({ leaderName: e.target.value })} /></div>
        <div><label className="label" htmlFor="leaderEmail">Leader email</label><input id="leaderEmail" className="input" type="email" placeholder="you@college.edu" value={t.leaderEmail || ''} onChange={e => onChange({ leaderEmail: e.target.value })} /><p className="hint">We&apos;ll send confirmation and updates here.</p></div>
        <div className="sm:col-span-2 sm:max-w-[50%]"><label className="label" htmlFor="leaderPhone">Leader phone</label><input id="leaderPhone" className="input" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={t.leaderPhone || ''} onChange={e => onChange({ leaderPhone: e.target.value.replace(/\D/g, '') })} /></div>
        <div><label className="label" htmlFor="leaderCollege">Leader college</label><input id="leaderCollege" className="input" placeholder="e.g. Annamacharya Institute of Technology And Sciences" value={t.college || ''} onChange={e => onChange({ college: e.target.value })} /></div>
        <div><label className="label" htmlFor="leaderDept">Leader department</label><input id="leaderDept" className="input" placeholder="e.g. Computer Science" value={t.department || ''} onChange={e => onChange({ department: e.target.value })} /></div>
        <div className="sm:max-w-[50%]"><label className="label" htmlFor="leaderYear">Leader academic year</label><select id="leaderYear" className="input" value={t.year || ''} onChange={e => onChange({ year: e.target.value })}><option value="">Select…</option>{YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="hint">✨ Your progress saves automatically in this browser.</p>
        <button className="btn-primary sm:!px-8" onClick={onNext}>Continue to members <span className="arr">→</span></button>
      </div>
    </div>
  );
}
