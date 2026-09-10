'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge, EmptyState } from '@/components/ui';

export default function RegList() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  async function load() {
    const r = await fetch('/api/admin/registrations?search=' + encodeURIComponent(q) + '&pay=' + pay);
    const j = await r.json();
    setRows(j.rows || []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);
  async function act(id: string, action: string) {
    if (action !== 'VERIFY' && !confirm(action === 'REJECT' ? 'Reject this registration?' : 'Mark this registration as duplicate?')) return;
    await fetch('/api/admin/registrations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: id, action, note }) });
    load();
  }
  return (
    <div className="enter pt-10">
      <h1 className="page-title">Registrations</h1>
      <p className="page-sub">Search, review, and verify teams. Verifying confirms the registration and syncs it to Excel.</p>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1"><label className="label" htmlFor="q">Search</label><input id="q" className="input" placeholder="ID, team, email, reference…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /></div>
        <div><label className="label" htmlFor="payf">Payment status</label><select id="payf" className="input" value={pay} onChange={e => setPay(e.target.value)}><option value="">All</option><option>PENDING</option><option>REVIEW_REQUIRED</option><option>VERIFIED</option><option>CONFIRMED</option><option>REJECTED</option><option>DUPLICATE</option><option>FAILED</option></select></div>
        <div><label className="label" htmlFor="note">Note for next action</label><input id="note" className="input" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} /></div>
        <button className="btn-primary" onClick={load}>Search</button>
      </div>
      <div className="card mt-4 overflow-x-auto !p-0">
        {loaded && rows.length === 0 ? (
          <div className="p-5"><EmptyState title="Nothing matches" body="Try a different search term or clear the status filter." /></div>
        ) : (
          <table className="data w-full">
            <thead><tr><th className="pl-5">ID</th><th>Team</th><th>Leader</th><th>Size</th><th>Payment</th><th>Date</th><th className="pr-5">Actions</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.registration_id}>
                <td className="pl-5"><Link className="link font-mono text-[13px]" href={'/admin/registrations/' + r.registration_id}>{r.registration_id}</Link></td>
                <td className="font-medium text-ink">{r.team_name}</td>
                <td>{r.leader_name}<br /><span className="meta">{r.leader_email}</span></td>
                <td>{r.team_size}</td>
                <td><StatusBadge status={r.payment_status || 'PENDING'} /></td>
                <td className="text-ink-muted">{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                <td className="whitespace-nowrap pr-5 text-[13px]">
                  <button className="link" onClick={() => act(r.registration_id, 'VERIFY')}>Verify</button>
                  <span className="mx-1.5 text-ink-muted">·</span>
                  <button className="link !text-danger" onClick={() => act(r.registration_id, 'REJECT')}>Reject</button>
                  <span className="mx-1.5 text-ink-muted">·</span>
                  <button className="link" onClick={() => act(r.registration_id, 'DUPLICATE')}>Duplicate</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
