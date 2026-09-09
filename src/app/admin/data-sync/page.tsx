'use client';
import { useEffect, useState } from 'react';
import { StatusBadge, EmptyState, Alert } from '@/components/ui';

export default function DataSyncPage() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function load() {
    const r = await fetch('/api/admin/sync');
    if (r.ok) setD(await r.json());
  }
  useEffect(() => { load(); }, []);
  async function act(action: string, jobId?: number) {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, jobId }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setMsg(action === 'rebuild' ? `Workbook rebuilt with ${j.count} registrations.` : 'Sync run finished.'); await load(); }
      else setMsg('That did not work — please try again.');
    } finally { setBusy(false); }
  }
  const h = d?.health || {};
  return (
    <div className="enter pt-10">
      <h1 className="page-title">Excel sync</h1>
      <p className="page-sub">Confirmed registrations flow here automatically. The database stays the source of truth — this workbook is a reporting copy.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-flat"><p className="metric-label">Health</p><p className={`mt-1 text-xl font-bold ${h.healthy ? 'text-mint' : 'text-danger'}`}>{h.healthy ? 'Healthy' : 'Needs attention'}</p></div>
        <div className="card-flat"><p className="metric-label">Last synced</p><p className="mt-1 text-xl font-bold">{h.lastSyncedAt ? String(h.lastSyncedAt).slice(0, 16).replace('T', ' ') : '—'}</p></div>
        <div className="card-flat"><p className="metric-label">Pending</p><p className="metric-value !text-2xl">{h.pending || 0}</p></div>
        <div className="card-flat"><p className="metric-label">Failed</p><p className="metric-value !text-2xl">{h.failed || 0}</p></div>
      </div>
      {h.lastError && <div className="mt-3"><Alert kind="error">Last error: {h.lastError}</Alert></div>}
      {msg && <div className="mt-3"><Alert kind={msg.includes('did not') ? 'error' : 'ok'}>{msg}</Alert></div>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a className="btn-primary" href="/api/admin/sync?action=download">Download workbook</a>
        <button className="btn-ghost" disabled={busy} onClick={() => act('sync-pending')}>Sync pending</button>
        <button className="btn-ghost" disabled={busy} onClick={() => act('retry-failed')}>Retry failed</button>
        <button className="btn-ghost" disabled={busy} onClick={() => act('rebuild')}>Rebuild from database</button>
        <span className="meta ml-1">{d?.workbook?.exists ? `${(d.workbook.size / 1024).toFixed(1)} KB · ` : ''}{h.success || 0} rows synced</span>
      </div>

      <div className="card mt-4 overflow-x-auto !p-0">
        {(d?.recent || []).length === 0 ? (
          <div className="p-5"><EmptyState title="No sync activity yet" body="Jobs appear here the first time a registration is confirmed." /></div>
        ) : (
          <table className="data w-full">
            <thead><tr><th className="pl-5">Job</th><th>Registration</th><th>Entity</th><th>Status</th><th>Attempts</th><th>Last error</th><th>Updated</th><th className="pr-5"></th></tr></thead>
            <tbody>
              {(d?.recent || []).map((j: any) => (
                <tr key={j.id}>
                  <td className="pl-5 text-slate-500">{j.id}</td>
                  <td className="font-mono text-[13px]">{j.registration_id}</td>
                  <td className="text-slate-400">{j.entity_type}</td>
                  <td><StatusBadge status={j.sync_status === 'SUCCESS' ? 'VERIFIED' : j.sync_status === 'FAILED' ? 'FAILED' : 'PENDING'} /></td>
                  <td>{j.attempt_count}</td>
                  <td className="max-w-[260px] truncate text-danger">{j.last_error || '—'}</td>
                  <td className="text-slate-500">{String(j.updated_at).slice(0, 19).replace('T', ' ')}</td>
                  <td className="pr-5">{j.sync_status !== 'SUCCESS' && <button className="link text-[13px]" disabled={busy} onClick={() => act('retry-job', j.id)}>Retry</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
