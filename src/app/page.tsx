'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/components/Reveal';

const WORDS = ['Build', 'Innovate', 'Solve', 'Transform'];

function Marquee() {
  const row = [...WORDS, ...WORDS, ...WORDS];
  return (
    <div className="marquee no-print select-none border-y border-white/10 py-3" aria-hidden>
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <span key={half}>
            {row.map((w, i) => (
              <span key={i} className="mx-5 font-mono text-sm uppercase tracking-[0.25em] text-slate-500">
                {w} <span className="ml-10 inline-block h-2 w-2 rounded-[2px] bg-lime/60" />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-[13px] text-lime">{no}</span>
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const [cfg, setCfg] = useState<any>(null);
  useEffect(() => { fetch('/api/settings').then((r) => r.json()).then(setCfg).catch(() => {}); }, []);
  const sched: any[] = cfg?.schedule?.length ? cfg.schedule : [
    { time: '09:00 – 09:30', title: 'Check-in', desc: 'Badges, kits and team verification.' },
    { time: '09:30 – 10:00', title: 'Opening ceremony', desc: 'Welcome address and keynote.' },
    { time: '10:00 – 10:30', title: 'Problem statements', desc: 'Tracks revealed, judging criteria explained.' },
    { time: '10:30 – 13:00', title: 'Build session', desc: 'Build your MVP with mentor support.' },
    { time: '13:00 – 14:00', title: 'Lunch', desc: 'Recharge and meet other teams.' },
  ];
  return (
    <div className="pt-14 sm:pt-20">
      {/* Hero — typographic statement */}
      <section className="enter max-w-3xl">
        <p className="eyebrow">
          {cfg?.hackathonName || 'Vision X 2026'} · One day
        </p>
        <h1 className="mt-4 text-5xl font-bold leading-[1.04] tracking-tight sm:text-7xl">
          Build something unreasonable in a day.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
          {cfg?.description || 'Bring a team, pick a problem, and ship a working prototype — with mentors on hand.'}
        </p>
        <div className="enter enter-d1 mt-7 flex flex-wrap items-center gap-3">
          {cfg && !cfg.regOpen ? (
            <span className="badge badge-neutral">Registrations are currently closed</span>
          ) : (
            <Link href="/register" className="btn-primary !px-6 !py-3 text-[15px]">Register your team <span className="arr">→</span></Link>
          )}
          <a href="#schedule" className="btn-ghost !px-6 !py-3 text-[15px]">See the schedule</a>
        </div>
        <dl className="enter enter-d2 mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/10 pt-5 text-sm">
          <div><dt className="meta">Entry fee</dt><dd className="mt-0.5 font-semibold">Rs.{cfg?.fee ?? 399} / team</dd></div>
          <div><dt className="meta">Venue</dt><dd className="mt-0.5 font-semibold">{cfg?.venue || 'Main Seminar Hall'}</dd></div>
          <div><dt className="meta">Team size</dt><dd className="mt-0.5 font-semibold">{cfg?.minTeam ?? 1}–{cfg?.maxTeam ?? 4}</dd></div>
        </dl>
      </section>

      <div className="mt-14"><Marquee /></div>

      {/* 01 — About */}
      <section id="about" className="mx-auto mt-16 max-w-5xl scroll-mt-24">
        <Reveal><SectionHead no="01" title="The format" sub="One day, one prototype, one demo." /></Reveal>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            ['Morning', 'Check in, hear the problem statements, and form your plan of attack.'],
            ['Midday', 'Build. Mentors circle the room — grab one when you are stuck.'],
            ['Evening', 'Demo live to the judges. The best prototypes take the stage.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i as 0 | 1 | 2}>
              <p className="font-mono text-4xl text-slate-600">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-[15px] font-semibold">{t}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-400">{d}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-8 grid gap-8 border-t border-white/10 pt-8 md:grid-cols-2">
            <div>
              <h3 className="text-[15px] font-semibold">Who can join</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-400">{cfg?.eligibility || 'Open to all college and university students with a valid ID card.'}</p>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">What to bring</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-400">Laptop, charger, college ID. We handle food, power, and Wi-Fi.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 02 — Schedule */}
      <section id="schedule" className="mx-auto mt-20 max-w-5xl scroll-mt-24">
        <Reveal><SectionHead no="02" title="Schedule" sub="9 AM to 6 PM." /></Reveal>
        <ol className="mt-8 border-t border-white/10">
          {sched.map((s: any, i: number) => (
            <Reveal key={i}>
              <li className="group grid gap-1 border-b border-white/10 py-4 transition-colors sm:grid-cols-[140px_1fr_2fr] sm:items-baseline sm:gap-6">
                <span className="font-mono text-[13px] text-slate-500">{s.time}</span>
                <span className="text-[15px] font-semibold transition-transform duration-200 group-hover:translate-x-1">{s.title}</span>
                <span className="text-sm text-slate-400">{s.desc}</span>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* 03 — FAQ */}
      <section id="faq" className="mx-auto mt-20 max-w-5xl scroll-mt-24">
        <Reveal><SectionHead no="03" title="Good to know" /></Reveal>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            ['How do I pay?', 'Online during registration — UPI, card, or netbanking. Your spot is confirmed only after our server verifies the payment.'],
            ['Is it safe?', 'Yes. We never ask for your UPI PIN or OTP — only the reference number from your payment app.'],
            ['Need help?', `Write to ${cfg?.contactEmail || 'the organising team'} or call ${cfg?.contactPhone || 'us'}.`],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i as 0 | 1 | 2}>
              <h3 className="text-[15px] font-semibold">{t}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-400">{d}</p>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl bg-elevated border border-white/10 px-6 py-6 text-ink sm:px-8">
            <p className="flex-1 text-lg font-medium tracking-tight text-slate-100">Teams are forming now. Yours?</p>
            <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-void transition hover:bg-white">Register your team <span className="ml-1.5">→</span></Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
