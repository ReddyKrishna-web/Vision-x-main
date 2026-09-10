'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/components/Reveal';

const WORDS = ['Build', 'Innovate', 'Solve', 'Ship', 'Demo'];

function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div className="marquee no-print select-none overflow-hidden rounded-full border border-ink/10 bg-white/70 py-3 backdrop-blur" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <span key={half}>
            {row.map((w, i) => (
              <span key={i} className="mx-5 font-mono text-[13px] uppercase tracking-[0.25em] text-ink-soft">
                {w} <span className="ml-8 inline-block h-2 w-2 rounded-full bg-accent" />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroVisual({ fee }: { fee: number }) {
  return (
    <div className="relative" aria-hidden>
      <div className="blob left-6 top-4 h-40 w-40 bg-accent/25" />
      <div className="blob right-8 top-20 h-32 w-32 bg-[#FFB59E]/60" />
      <div className="card-glass float-soft relative rotate-2 p-5">
        <p className="eyebrow">Live demo day</p>
        <p className="font-display mt-2 text-4xl font-bold tracking-tight">09:00 → 18:00</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="meta">Entry</p>
            <p className="font-display text-2xl font-bold">Rs.{fee} <span className="text-sm font-semibold text-ink-soft">/ team</span></p>
          </div>
          <span className="rounded-full bg-lime px-3 py-1.5 font-mono text-xs font-bold">● mentors live</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {['09', '10', '11', '13', '15', '17', '18'].map((h, i) => (
            <div key={h} className="rounded-xl bg-paper px-1 py-2 text-center">
              <p className="font-mono text-[10px] text-ink-muted">{h}</p>
              <div className={`mx-auto mt-1 h-8 w-1.5 rounded-full ${i < 4 ? 'bg-accent' : 'bg-ink/10'}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="card-glass absolute -bottom-8 -left-2 w-52 -rotate-3 p-4 shadow-pop sm:-left-8">
        <p className="flex items-center gap-2 font-mono text-xs"><span className="px-tick-live" /> check-in open</p>
        <p className="font-display mt-1 text-lg font-bold leading-tight">Badges, kits & high-fives</p>
      </div>
      <div className="absolute -right-2 -top-6 rotate-6 rounded-2xl bg-ink px-4 py-3 text-white shadow-pop sm:-right-6">
        <p className="font-display text-sm font-bold">+ mentors on floor</p>
        <p className="font-mono text-[11px] text-white/60">grab one when stuck</p>
      </div>
    </div>
  );
}

function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink font-display text-sm font-bold text-white">{no}</span>
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {sub && <p className="page-sub max-w-xl">{sub}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const [cfg, setCfg] = useState<any>(null);
  useEffect(() => { fetch('/api/settings').then((r) => r.json()).then(setCfg).catch(() => {}); }, []);
  const fee = cfg?.fee ?? 399;
  const venue = cfg?.venue || 'Annamayya Auditorium';
  const sched: any[] = cfg?.schedule?.length ? cfg.schedule : [
    { time: '09:00 – 09:30', title: 'Check-in', desc: 'Badges, kits and team verification.' },
    { time: '09:30 – 10:00', title: 'Opening ceremony', desc: 'Welcome address and keynote.' },
    { time: '10:00 – 10:30', title: 'Problem statements', desc: 'Tracks revealed, judging criteria explained.' },
    { time: '10:30 – 13:00', title: 'Build session', desc: 'Build your MVP with mentor support.' },
    { time: '13:00 – 14:00', title: 'Lunch', desc: 'Recharge and meet other teams.' },
  ];
  return (
    <div className="pt-8 sm:pt-12">
      {/* HERO */}
      <section className="enter relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-mint animate-px-blink" />
            {cfg?.hackathonName || 'Vision X 2026'} · One day · In person
          </p>
          <h1 className="font-display mt-5 text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
            Build something{' '}
            <span className="relative inline-block">
              <span className="relative z-10">unreasonable</span>
              <svg className="absolute -bottom-2 left-0 z-0 w-full" viewBox="0 0 220 14" fill="none" aria-hidden>
                <path d="M3 10 C 60 3, 160 3, 217 8" stroke="#D9F450" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </span>{' '}
            in a day.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            {cfg?.description || 'Bring a team, pick a problem, and ship a working prototype — with mentors on hand, food sorted, and a live demo at sunset.'}
          </p>
          <div className="enter enter-d1 mt-7 flex flex-wrap items-center gap-3">
            {cfg && !cfg.regOpen ? (
              <span className="badge badge-neutral !px-4 !py-2">Registrations are currently closed</span>
            ) : (
              <Link href="/register" className="btn-lime !px-7 !py-4 text-base">Register your team <span className="arr">→</span></Link>
            )}
            <a href="#schedule" className="btn-ghost !px-7 !py-4 text-base">See the schedule</a>
          </div>
          <dl className="enter enter-d2 mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ['Entry fee', `Rs.${fee} / team`],
              ['Venue', venue],
              ['Team size', `${cfg?.minTeam ?? 1}–${cfg?.maxTeam ?? 4} people`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-ink/[0.07] bg-white/80 px-4 py-3 backdrop-blur">
                <dt className="meta">{k}</dt>
                <dd className="mt-1 text-sm font-bold leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Reveal className="mt-6 lg:mt-0" delay={1}>
          <HeroVisual fee={fee} />
        </Reveal>
      </section>

      <div className="mt-16"><Marquee /></div>

      {/* 01 — About */}
      <section id="about" className="mx-auto mt-20 max-w-6xl scroll-mt-28">
        <Reveal><SectionHead no="01" title="One day, one prototype" sub="A calm, beginner-friendly format with just enough pressure to make it exciting." /></Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['☀️', 'Morning', 'Check in, hear the problem statements, and sketch your plan of attack over chai.', 'bg-[#FFF1E4]'],
            ['🛠️', 'Midday', 'Build your MVP. Mentors circle the room — grab one the moment you feel stuck.', 'bg-violet-50'],
            ['🎤', 'Evening', 'Demo live to the judges. The best prototypes take the stage and take prizes.', 'bg-[#F2F7D5]'],
          ].map(([e, t, d, bg], i) => (
            <Reveal key={t} delay={i as 0 | 1 | 2}>
              <article className={`lift rounded-[22px] border border-ink/[0.07] ${bg} p-6`}>
                <p className="text-3xl" aria-hidden>{e}</p>
                <p className="font-mono mt-3 text-xs uppercase tracking-[0.18em] text-ink-muted">Phase 0{i + 1}</p>
                <h3 className="font-display mt-1 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{d}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="font-display text-lg font-bold">Who can join 🎓</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{cfg?.eligibility || 'Open to all college and university students with a valid ID card. Beginners especially welcome.'}</p>
            </div>
            <div className="card-dark relative overflow-hidden p-6 sm:p-8">
              <div className="blob right-0 top-0 h-32 w-32 bg-accent/50" />
              <h3 className="font-display text-lg font-bold">What to bring 🎒</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-white/75">Laptop, charger, college ID. We handle food, power, Wi-Fi — and good vibes.</p>
              <Link href="/register" className="btn-lime mt-4 !py-2.5 text-sm">Claim your seats →</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 02 — Schedule */}
      <section id="schedule" className="mx-auto mt-20 max-w-6xl scroll-mt-28">
        <Reveal><SectionHead no="02" title="Schedule" sub="9 AM to 6 PM — paced so you can actually finish." /></Reveal>
        <Reveal delay={1}>
          <ol className="card mt-8 !p-2 sm:!p-3">
            {sched.map((s: any, i: number) => (
              <li key={i} className="group grid gap-1 rounded-2xl px-4 py-4 transition-colors hover:bg-paper sm:grid-cols-[150px_1fr_2fr] sm:items-center sm:gap-6">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-paper px-3 py-1 font-mono text-[12px] font-bold text-ink group-hover:bg-lime/60">{s.time}</span>
                <span className="font-display text-base font-bold transition-transform duration-200 group-hover:translate-x-1">{s.title}</span>
                <span className="text-sm leading-relaxed text-ink-soft">{s.desc}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* 03 — FAQ */}
      <section id="faq" className="mx-auto mt-20 max-w-6xl scroll-mt-28">
        <Reveal><SectionHead no="03" title="Good to know" sub="Payments, safety, and who to ping." /></Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['💳', 'How do I pay?', 'During registration you scan our UPI QR with any UPI app and submit the transaction reference. Your spot is confirmed after our team verifies the payment.'],
            ['🛡️', 'Is it safe?', 'Yes. You pay directly inside your own UPI app — this site never sees your UPI PIN or bank details, and we never ask for OTPs.'],
            ['💬', 'Need help?', `Write to ${cfg?.contactEmail || 'the organising team'} or call ${cfg?.contactPhone || 'us'} — we reply fast on event week.`],
          ].map(([e, t, d], i) => (
            <Reveal key={t} delay={i as 0 | 1 | 2}>
              <article className="card lift h-full">
                <p className="text-2xl" aria-hidden>{e}</p>
                <h3 className="font-display mt-2 text-lg font-bold">{t}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{d}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="card-dark relative mt-6 overflow-hidden px-6 py-10 text-center sm:px-12">
            <div className="blob left-10 top-0 h-40 w-40 bg-accent/50" />
            <div className="blob bottom-0 right-10 h-32 w-32 bg-lime/30" />
            <p className="eyebrow !text-white/60 justify-center">Teams are forming now</p>
            <p className="font-display mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">Yours could be the demo everyone remembers.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="btn-lime !px-8 !py-4 text-base">Register your team <span className="ml-1.5">→</span></Link>
              <span className="font-mono text-xs text-white/50">takes ~3 min · Rs.{fee}/team</span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
