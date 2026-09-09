'use client';
export function TeamStep({ t, cfg, onChange, onNext }: any) {
  return (
    <div className="card mt-5">
      <h2 className="section-title">About your team</h2>
      <p className="page-sub">Start with the basics — members come next.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="teamName">Team name</label><input id="teamName" className="input" placeholder="e.g. Null Pointers" value={t.teamName || ''} onChange={e => onChange({ teamName: e.target.value })} /></div>
        <div><label className="label" htmlFor="teamSize">Team size</label><select id="teamSize" className="input" value={t.teamSize || ''} onChange={e => onChange({ teamSize: Number(e.target.value) }, true)}><option value="">Select…</option>{Array.from({ length: (cfg?.maxTeam || 4) - (cfg?.minTeam || 1) + 1 }, (_, i) => (cfg?.minTeam || 1) + i).map(n => <option key={n} value={n}>{n} {n === 1 ? 'member' : 'members'}</option>)}</select></div>
        <div><label className="label" htmlFor="leaderName">Team leader name</label><input id="leaderName" className="input" placeholder="Full name" value={t.leaderName || ''} onChange={e => onChange({ leaderName: e.target.value })} /></div>
        <div><label className="label" htmlFor="leaderEmail">Leader email</label><input id="leaderEmail" className="input" type="email" placeholder="you@college.edu" value={t.leaderEmail || ''} onChange={e => onChange({ leaderEmail: e.target.value })} /><p className="hint">We'll send confirmation and updates here.</p></div>
        <div className="sm:col-span-2 sm:max-w-[50%]"><label className="label" htmlFor="leaderPhone">Leader phone</label><input id="leaderPhone" className="input" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={t.leaderPhone || ''} onChange={e => onChange({ leaderPhone: e.target.value.replace(/\D/g, '') })} /></div>
      </div>
      <div className="mt-5"><button className="btn-primary" onClick={onNext}>Continue to members</button></div>
    </div>
  );
}
