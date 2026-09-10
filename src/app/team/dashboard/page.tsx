'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, StatusBadge } from '@/components/ui';

type Me = { registration: any; members: any[]; payment: any };

export default function TeamDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [qr, setQr] = useState<{ verifyUrl: string; qrDataUrl: string } | null>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/team/me')
      .then(async (r) => {
        if (r.status === 401) { router.push('/team/login'); return null; }
        return r.json();
      })
      .then((j) => { if (alive && j) { if (j.error) setErr(j.error); else setMe(j); } })
      .catch(() => { if (alive) setErr('Could not load your dashboard. Please try again.'); });
    fetch('/api/team/qr')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.qrDataUrl) setQr(j); })
      .catch(() => {});
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setCfg(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [router]);

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/team/logout', { method: 'POST' });
      router.push('/team/login');
    } finally {
      setBusy(false);
    }
  }

  if (err && !me) {
    return (
      <div className="enter mx-auto max-w-md pt-12">
        <Alert kind="error">{err}</Alert>
        <p className="mt-4 text-center"><Link href="/team/login" className="link text-sm">Back to Team Login</Link></p>
      </div>
    );
  }
  if (!me) return <p className="pt-12 text-center text-sm text-ink-muted">Loading your dashboard…</p>;

  const reg = me.registration;
  const pay = me.payment;
  const venue = cfg?.venue || 'Annamayya Auditorium';
  const locationName = cfg?.locationName || 'Annamacharya Institute of Technology And Sciences';
  const locationAddress = cfg?.locationAddress || 'Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520';
  const mapEmbedUrl = cfg?.mapEmbedUrl || 'https://www.google.com/maps?q=Annamacharya%20Institute%20of%20Technology%20and%20Sciences%20Venkatapuram%20Renigunta%20Tirupati%20Andhra%20Pradesh%20517520&output=embed';
  const mapLink = cfg?.mapLink || 'https://www.google.com/maps/search/?api=1&query=Annamacharya+Institute+of+Technology+and+Sciences+Venkatapuram+Renigunta+Tirupati+Andhra+Pradesh+517520';
  const collegeImage = cfg?.collegeImage || '/images/college.jpg';

  return (
    <div className="enter mx-auto max-w-3xl pt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Vision X 2026 · Team dashboard</p>
          <h1 className="page-title mt-2">{reg.team_name}</h1>
          <p className="page-sub">Project ID <span className="font-mono font-bold text-ink">{reg.registration_id}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={reg.registration_status || 'PENDING'} />
          <button className="btn-ghost !px-4 !py-2 text-sm" onClick={logout} disabled={busy}>{busy ? '…' : 'Log out'}</button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <section className="card">
            <h2 className="section-title">Team information ℹ️</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-ink-muted">Team</dt><dd className="font-semibold">{reg.team_name} · {reg.team_size} {Number(reg.team_size) === 1 ? 'member' : 'members'}</dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-ink-muted">Status</dt><dd><StatusBadge status={reg.registration_status || 'PENDING'} /></dd></div>
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-ink-muted">Payment</dt><dd>{pay ? <StatusBadge status={pay.payment_status} /> : <span className="text-ink-muted">—</span>}</dd></div>
              {(reg.college || reg.department || reg.year) && (
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-ink-muted">College</dt><dd>{[reg.college, reg.department, reg.year].filter(Boolean).join(' · ')}</dd></div>
              )}
            </dl>
          </section>

          <section className="card">
            <h2 className="section-title">Team leader 🧭</h2>
            <p className="mt-2 text-sm"><span className="font-semibold">{reg.leader_name}</span><br />
              <span className="text-ink-soft">{reg.leader_email} · {reg.leader_phone}</span></p>
            <h2 className="section-title mt-5">Members</h2>
            <ul className="mt-2 divide-y divide-ink/[0.07] text-sm">
              {me.members.map((m: any) => (
                <li key={m.idx} className="py-2">
                  <span className="font-medium">{m.name}</span>{' '}
                  <span className="text-ink-muted">· {m.roll_number} · {m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
                </li>
              ))}
              {me.members.length === 0 && <li className="py-2 text-ink-muted">No members found.</li>}
            </ul>
          </section>
        </div>

        <section className="card h-fit lg:sticky lg:top-24">
          <h2 className="section-title">Check-in QR 🎟️</h2>
          <p className="page-sub">Show this at the venue for fast check-in.</p>
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qrDataUrl} alt={`Check-in QR code for team ${reg.team_name}`} className="qr-scan mx-auto mt-4 h-52 w-52" />
              <p className="meta mt-3 break-all text-center">{qr.verifyUrl}</p>
            </>
          ) : (
            <div className="skeleton mx-auto mt-4 h-52 w-52" aria-label="Loading QR code" />
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Venue 🏛️</h2>
          <p className="font-display mt-3 text-xl font-bold leading-snug">{venue}</p>
          <p className="mt-1 text-sm text-ink-soft">{locationName}</p>
          <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink-soft">
            Report at {venue} for check-in, badges and the opening ceremony. Keep your QR and college ID ready.
          </p>
        </section>

        <section className="card">
          <h2 className="section-title">Location 📍</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collegeImage}
            alt={`${locationName} campus`}
            className="mt-3 h-44 w-full rounded-2xl border border-ink/[0.07] object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="mt-3 text-sm font-semibold">{locationName}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{locationAddress}</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-ink/[0.07]">
            <iframe
              title={`Map — ${locationName}, Tirupati`}
              src={mapEmbedUrl}
              className="h-56 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn-primary !px-4 !py-2 text-sm">
              Get directions →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
