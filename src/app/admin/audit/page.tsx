'use client';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui';

export default function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { fetch('/api/admin/audit').then((r) => r.json()).then((j) => { setRows(j.rows || []); setLoaded(true); }); }, []);
  return (
    <div className="enter pt-10">
      <h1 className="page-title">Audit log</h1>
      <p className="page-sub">Every important action, who did it, and when.</p>
      <div className="card mt-4 overflow-x-auto !p-0">
        {loaded && rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No activity yet" body="Actions like verifications, payments, and syncs will be recorded here." /></div>
        ) : (
          <table className="data w-full">
            <thead><tr><th className="pl-5">Time</th><th>Action</th><th>Admin</th><th>Registration</th><th className="pr-5">Details</th></tr></thead>
            <tbody>{rows.map((r: any) => (
              <tr key={r.id}>
                <td className="pl-5 font-mono text-[13px] text-ink-muted">{String(r.created_at).slice(0, 19).replace('T', ' ')}</td>
                <td className="font-mono text-[13px] font-semibold">{r.action}</td>
                <td>{r.admin || '—'}</td>
                <td className="font-mono text-[13px]">{r.registration_id || '—'}</td>
                <td className="max-w-md truncate pr-5 text-ink-soft">{r.details || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
