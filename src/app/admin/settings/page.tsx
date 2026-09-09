'use client';
import { useEffect, useState } from 'react';

const FIELD_LABELS: Record<string, string> = {
  hackathon_name: 'Event name', description: 'Description', registration_fee: 'Entry fee (Rs.)',
  min_team_size: 'Minimum team size', max_team_size: 'Maximum team size',
  reg_open: 'Registrations', reg_start: 'Opens on', reg_end: 'Closes on', venue: 'Venue',
  contact_email: 'Contact email', contact_phone: 'Contact phone', rules: 'Rules', eligibility: 'Eligibility',
  reg_prefix: 'Registration ID prefix',
};
const FIELDS = Object.keys(FIELD_LABELS);

export default function SettingsPage() {
  const [f, setF] = useState<any>({});
  const [sched, setSched] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/admin/settings').then((r) => r.json()).then((j) => { setF(j); setSched(j.schedule_json || '[]'); }); }, []);
  async function save() {
    setMsg('');
    const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, schedule_json: sched }) });
    setMsg(r.ok ? 'Settings saved.' : 'Could not save — please try again.');
  }
  return (
    <div className="enter mx-auto max-w-3xl pt-10">
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">These control what participants see on the site. Payments are processed via Razorpay.</p>
      <div className="card mt-5 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((k) => (
          <div key={k} className={k === 'description' || k === 'rules' || k === 'eligibility' ? 'sm:col-span-2' : ''}>
            <label className="label" htmlFor={'s-' + k}>{FIELD_LABELS[k]}</label>
            {k === 'reg_open'
              ? <select id={'s-' + k} className="input" value={String(f[k] ?? 1)} onChange={e => setF({ ...f, [k]: Number(e.target.value) })}><option value="1">Open</option><option value="0">Closed</option></select>
              : <input id={'s-' + k} className="input" value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} />}
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-sched">Schedule <span className="font-normal text-slate-500">(JSON list of time, title, desc)</span></label>
          <textarea id="s-sched" className="input h-32 font-mono text-[13px]" value={sched} onChange={e => setSched(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Save settings</button>
          {msg && <span className={`text-sm ${msg.includes('Could not') ? 'text-danger' : 'text-mint'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
