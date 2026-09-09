'use client';
import { useEffect, useState } from 'react';
import { StatusBadge, EmptyState, Alert } from '@/components/ui';

export default function AdminPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (risk) p.set('risk', risk);
    const r = await fetch('/api/admin/payments?' + p.toString());
    if (r.ok) setData(await r.json());
  }
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('status');
    if (preset) setStatus(preset);
  }, []);
  useEffect(() => { load(); }, [status]);
  async function openDetail(id: number) {
    const r = await fetch('/api/admin/payments/detail?paymentId=' + id);
    if (r.ok) { setSel(await r.json()); setMsg(''); }
  }
  async function act(action: string) {
    if (!sel) return;
    if ((action === 'REJECT' || action === 'BLOCK') && !confirm(action === 'REJECT' ? 'Reject this payment?' : 'Block this payment as fraud?')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/payments', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: sel.payment.id, action, note }),
      });
      if (r.ok) { setMsg('Decision saved.'); setNote(''); await load(); await openDetail(sel.payment.id); }
      else setMsg('That did not work — please try again.');
    } finally { setBusy(false); }
  }

  const s = data?.stats || {};
  return (
    <div className="enter pt-10">
      <h1 className="page-title">Payments</h1>
      <p className="page-sub">Revenue, verification queue, and fraud review — in one place.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[['Revenue', '₹' + (s.revenue || 0)], ['Confirmed', s.success || 0], ['Pending', s.pending || 0], ['Failed', s.failed || 0], ['Fraud review', s.review || 0], ['Success rate', (s.successRate ?? '—') + '%']].map(([t, v]: any) => (
          <div key={t} className="card-flat"><p className="metric-label">{t}</p><p className="metric-value !text-2xl">{v}</p></div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1"><label className="label" htmlFor="ps">Search</label><input id="ps" className="input" placeholder="Team, reference, order ID…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} /></div>
        <div><label className="label" htmlFor="pst">Status</label><select id="pst" className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{['PENDING', 'PROCESSING', 'VERIFYING', 'VERIFIED', 'CONFIRMED', 'REVIEW_REQUIRED', 'FAILED', 'REJECTED', 'DUPLICATE', 'FRAUD_BLOCKED', 'EXPIRED', 'CANCELLED'].map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className="label" htmlFor="pr">Risk</label><select id="pr" className="input" value={risk} onChange={(e) => setRisk(e.target.value)}><option value="">All</option><option value="HIGH">High / critical</option><option value="REVIEW">In review</option></select></div>
        <button className="btn-primary" onClick={load}>Filter</button>
      </div>

      <div className="card mt-4 overflow-x-auto !p-0">
        {(data?.rows || []).length === 0 ? (
          <div className="p-5"><EmptyState title="No payments found" body="Payments appear here as soon as teams start paying." /></div>
        ) : (
          <table className="data w-full">
            <thead><tr><th className="pl-5">Registration</th><th>Team</th><th className="text-right">Amount</th><th>Provider</th><th>Reference</th><th>Status</th><th>Risk</th><th className="pr-5">Date</th></tr></thead>
            <tbody>
              {(data?.rows || []).map((r: any) => (
                <tr key={r.id} className="rowlink" onClick={() => openDetail(r.id)}>
                  <td className="pl-5 font-mono text-[13px]">{r.registration_id}</td>
                  <td className="font-medium text-slate-100">{r.team_name}</td>
                  <td className="text-right font-semibold">₹{r.amount}</td>
                  <td className="text-slate-400">{r.provider}</td>
                  <td className="max-w-[180px] truncate font-mono text-[13px]">{r.transaction_id || r.provider_order_id || r.payment_reference || '—'}</td>
                  <td><StatusBadge status={r.payment_status} /></td>
                  <td className="text-slate-400">{r.fraud_risk_score} · {r.fraud_risk_level}</td>
                  <td className="pr-5 text-slate-500">{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sel && (
        <div className="card mt-4" role="dialog" aria-label="Payment investigation">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="section-title font-mono">{sel.payment.registration_id}</h2>
              <StatusBadge status={sel.payment.payment_status} />
            </div>
            <button className="btn-ghost !py-1.5 text-sm" onClick={() => setSel(null)}>Close</button>
          </div>
          {msg && <div className="mt-3"><Alert kind={msg.includes('did not') ? 'error' : 'ok'}>{msg}</Alert></div>}

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Payment trail</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                {[['Provider', sel.payment.provider], ['Gateway order', sel.payment.provider_order_id], ['Gateway payment', sel.payment.provider_payment_id], ['UTR / reference', sel.payment.transaction_id || sel.payment.payment_reference], ['Gateway says', sel.payment.gateway_status], ['Verification', sel.payment.verification_status], ['Webhook', sel.payment.webhook_verified ? 'Verified' : 'Not received']].map(([k, v]: any) => (
                  <div key={k} className="flex gap-2"><dt className="w-32 shrink-0 text-slate-500">{k}</dt><dd className="font-mono text-[13px]">{v || '—'}</dd></div>
                ))}
              </dl>
              <h3 className="mt-4 text-sm font-semibold">Screenshot evidence</h3>
              <p className="mt-1 text-sm text-slate-400">{sel.payment.screenshot_path ? 'Attached (stored privately).' : 'No screenshot provided.'} {sel.payment.ocr_txn ? `OCR read: ${sel.payment.ocr_txn}.` : ''}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Why this risk score: {sel.fraud.score} ({sel.fraud.level})</h3>
              {(sel.fraud.reasons || []).length === 0
                ? <p className="mt-1 text-sm text-slate-400">Nothing suspicious detected.</p>
                : <ul className="mt-2 space-y-1.5 text-sm">{(sel.fraud.reasons || []).map((r: any, i: number) => <li key={i} className="rounded-md bg-white/5 px-3 py-2"><span className="font-mono text-[13px] font-semibold">{r.ruleId}</span> <span className="text-slate-500">+{r.points}</span><br /><span className="text-slate-400">{r.evidence}</span></li>)}</ul>}
              <h3 className="mt-4 text-sm font-semibold">Possibly related</h3>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[13px]">
                {Object.entries(sel.related || {}).map(([k, v]: any) => (
                  <div key={k} className="rounded-md border border-white/10 bg-white/[0.02] p-2"><p className="font-semibold">{k.replace('by', '')}</p>{(v || []).length === 0 ? <p className="text-slate-500">None</p> : (v || []).map((x: any) => <p key={x.registration_id} className="font-mono">{x.registration_id}</p>)}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <label className="label" htmlFor="pay-note">Note <span className="font-normal text-slate-500">(saved with your decision)</span></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="pay-note" className="input flex-1" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={busy} onClick={() => act('VERIFY')}>Verify</button>
                <button className="btn-danger" disabled={busy} onClick={() => act('REJECT')}>Reject</button>
                <button className="btn-ghost" disabled={busy} onClick={() => act('REVIEW')}>Needs review</button>
                <button className="btn-ghost" disabled={busy} onClick={() => act('DUPLICATE')}>Duplicate</button>
                <button className="btn-ghost" disabled={busy} onClick={() => act('BLOCK')}>Fraud</button>
                <button className="btn-ghost" disabled={busy} onClick={() => act('CLEAR_FRAUD')}>Clear risk</button>
              </div>
            </div>
          </div>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-slate-500">Audit trail ({(sel.timeline || []).length})</summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[13px] text-slate-400">
              {(sel.timeline || []).map((t: any) => <li key={t.id}><span className="font-mono">{String(t.created_at).slice(0, 19).replace('T', ' ')}</span> · <span className="font-semibold">{t.action}</span>{t.admin ? ` · ${t.admin}` : ''}{t.details ? ` — ${t.details}` : ''}</li>)}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
