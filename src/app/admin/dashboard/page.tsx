'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge, EmptyState } from '@/components/ui';

export default function AdminDash() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { fetch('/api/admin/stats').then((r) => r.json()).then(setS).catch(() => {}); }, []);
  const pending = s ? (s.by.PENDING || 0) + (s.by.REVIEW_REQUIRED || 0) + (s.by.OCR_DETECTED || 0) + (s.by.MANUAL_REVIEW || 0) + (s.by.VERIFYING || 0) + (s.by.PENDING_PAYMENT || 0) : 0;
  const metrics = s ? [
    { label: 'Total registrations', value: s.total, href: '/admin/registrations' },
    { label: 'Participants', value: s.participants, href: '/admin/registrations' },
    { label: 'Needs review', value: pending, href: '/admin/payments' },
    { label: 'Confirmed', value: (s.by.CONFIRMED || 0) + (s.by.VERIFIED || 0), href: '/admin/payments?status=CONFIRMED' },
    { label: 'Rejected', value: s.by.REJECTED || 0, href: '/admin/payments?status=REJECTED' },
    { label: 'Duplicates', value: s.by.DUPLICATE || 0, href: '/admin/payments?status=DUPLICATE' },
  ] : [];
  return (
    <div className="enter pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Registrations, payments, and data sync at a glance.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
          <Link href="/admin/registrations" className="btn-ghost !py-2 text-sm">Registrations</Link>
          <Link href="/admin/payments" className="btn-ghost !py-2 text-sm">Payments</Link>
          <Link href="/admin/data-sync" className="btn-ghost !py-2 text-sm">Excel sync</Link>
          <Link href="/admin/settings" className="btn-ghost !py-2 text-sm">Settings</Link>
        </nav>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <Link key={m.label} href={m.href} className="card-flat lift">
            <p className="metric-label">{m.label}</p>
            <p className="metric-value">{m.value}</p>
          </Link>
        ))}
      </div>

      {s?.sync && (
        <div className="card-flat mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">Excel sync</span>
            <span className="text-ink-muted"> — last updated {s.sync.lastSyncedAt ? String(s.sync.lastSyncedAt).slice(0, 16).replace('T', ' ') : 'never'} · {s.sync.pending} pending · {s.sync.failed} failed</span>
          </p>
          <Link className="link text-sm" href="/admin/data-sync">{s.sync.healthy ? 'View details' : 'Needs attention'}</Link>
        </div>
      )}

      <div className="card mt-4 overflow-x-auto !p-0">
        <h2 className="section-title px-5 pt-5">Recent registrations</h2>
        {(s?.recent || []).length === 0 ? (
          <div className="p-5"><EmptyState title="No registrations yet" body="New signups will appear here as soon as teams start registering." /></div>
        ) : (
          <table className="data mt-2 w-full">
            <thead><tr><th className="pl-5">ID</th><th>Team</th><th>Leader</th><th>Status</th><th className="pr-5">Date</th></tr></thead>
            <tbody>
              {(s?.recent || []).map((r: any) => (
                <tr key={r.registration_id}>
                  <td className="pl-5"><Link className="link font-mono text-[13px]" href={'/admin/registrations/' + r.registration_id}>{r.registration_id}</Link></td>
                  <td>{r.team_name}</td>
                  <td>{r.leader_name}</td>
                  <td><StatusBadge status={r.payment_status || 'PENDING'} /></td>
                  <td className="pr-5 text-ink-muted">{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
