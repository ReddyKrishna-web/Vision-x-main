'use client';
const scopes = [
  { id: 'ALL', desc: 'Every registration in the database.' },
  { id: 'VERIFIED', desc: 'Confirmed and verified payments only.' },
  { id: 'PENDING', desc: 'Still awaiting verification.' },
  { id: 'REJECTED', desc: 'Rejected registrations.' },
  { id: 'DUPLICATE', desc: 'Flagged duplicates.' },
];
export default function ExportPage() {
  return (
    <div className="enter mx-auto max-w-2xl pt-10">
      <h1 className="page-title">Export snapshots</h1>
      <p className="page-sub">One-off downloads, generated live from the database. For the always-up-to-date master file, use <a className="link" href="/admin/data-sync">Excel sync</a>.</p>
      <div className="mt-5 space-y-2">
        {scopes.map((s) => (
          <a key={s.id} href={'/api/admin/export?scope=' + s.id} className="card-flat flex items-center justify-between gap-3 transition hover:border-white/20">
            <span><span className="text-sm font-semibold">{s.id.charAt(0) + s.id.slice(1).toLowerCase()}</span><br /><span className="text-sm text-slate-400">{s.desc}</span></span>
            <span className="link text-sm">Download .xlsx</span>
          </a>
        ))}
      </div>
    </div>
  );
}
