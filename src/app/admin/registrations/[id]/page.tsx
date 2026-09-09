'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge, Alert } from '@/components/ui';

export default function Detail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<any>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  async function load() {
    const r = await fetch('/api/admin/detail?id=' + params.id);
    setD(await r.json());
  }
  useEffect(() => { load(); }, []);
  async function act(action: string) {
    setMsg('');
    const r = await fetch('/api/admin/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: params.id, action, note }) });
    setMsg(r.ok ? (action === 'VERIFY' ? 'Registration confirmed and queued for Excel sync.' : 'Saved.') : 'That did not work — please try again.');
    setNote('');
    load();
  }
  if (!d?.reg) return <p className="pt-10 text-sm text-slate-500">Loading registration…</p>;
  return (
    <div className="pt-10">
      <Link href="/admin/registrations" className="link text-sm">← All registrations</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="page-title font-mono">{d.reg.registration_id}</h1>
        <StatusBadge status={d.pay?.payment_status || 'PENDING'} />
      </div>
      <p className="page-sub">{d.reg.team_name} · {d.reg.team_size} {d.reg.team_size === 1 ? 'member' : 'members'}</p>
      {msg && <div className="mt-3 max-w-2xl"><Alert kind={msg.includes('did not') ? 'error' : 'ok'}>{msg}</Alert></div>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="section-title">Team</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">Leader</dt><dd>{d.reg.leader_name}<br /><span className="text-slate-400">{d.reg.leader_email} · {d.reg.leader_phone}</span></dd></div>
            {(d.reg.college || d.reg.department || d.reg.year) && (
              <div className="flex gap-2"><dt className="w-20 shrink-0 text-slate-500">College</dt><dd>{[d.reg.college, d.reg.department, d.reg.year].filter(Boolean).join(' · ')}</dd></div>
            )}
          </dl>
          <h2 className="section-title mt-5">Members</h2>
          <ul className="mt-2 divide-y divide-white/5 text-sm">
            {d.mems.map((m: any) => (
              <li key={m.id} className="py-2"><span className="font-medium">{m.name}</span> <span className="text-slate-500">· {m.roll_number} · {m.email}{m.phone ? ` · ${m.phone}` : ''}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="section-title">Payment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Reference</dt><dd className="font-mono">{d.pay?.manual_txn || d.pay?.transaction_id || '—'}</dd></div>
            {d.pay?.ocr_txn && <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">OCR read</dt><dd className="font-mono">{d.pay.ocr_txn}</dd></div>}
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Amount</dt><dd className="font-semibold">Rs.{d.pay?.amount}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Provider</dt><dd>{d.pay?.provider || '—'}{d.pay?.provider_order_id ? ` · ${d.pay.provider_order_id}` : ''}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">Risk</dt><dd>{d.pay?.fraud_risk_score ?? 0} · {d.pay?.fraud_risk_level || 'LOW'}</dd></div>
          </dl>
          {d.screenshotUrl && <img src={d.screenshotUrl} alt="Payment screenshot evidence" className="mt-3 max-h-80 rounded-lg border border-white/10" />}
          <div className="mt-4">
            <label className="label" htmlFor="admin-note">Note <span className="font-normal text-slate-500">(saved with your decision)</span></label>
            <textarea id="admin-note" className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => act('VERIFY')}>Verify payment</button>
            <button className="btn-danger" onClick={() => act('REJECT')}>Reject</button>
            <button className="btn-ghost" onClick={() => act('DUPLICATE')}>Mark duplicate</button>
          </div>
          <p className="meta mt-3">Checked by {d.pay?.verified_by || 'no one yet'}{d.pay?.verified_at ? ` · ${String(d.pay.verified_at).slice(0, 16).replace('T', ' ')}` : ''}</p>
        </div>
      </div>
    </div>
  );
}
