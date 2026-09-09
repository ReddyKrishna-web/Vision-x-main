'use client';
import { useRegister } from './useRegister';
import { TeamStep } from './TeamStep';
import { MembersStep, PayStep } from './steps';
import { Alert } from '@/components/ui';

const STEPS = ['Team', 'Members', 'Payment'];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper mt-5" aria-label="Registration progress">
      {STEPS.map((s, i) => (
        <li key={s} className={`step-item ${i === current ? 'step-active' : i < current ? 'step-done' : 'step-todo'}`}>
          <span className="step-num" aria-hidden>{i < current ? '✓' : i + 1}</span>
          <span className="step-name">{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 text-slate-600" aria-hidden>·</span>}
        </li>
      ))}
    </ol>
  );
}

export default function RegisterPage() {
  const { cfg, d, setD, set, err, setErr, busy, consent, setConsent, validTeam, validMembers, pay } = useRegister();
  const t = d.team;
  return (
    <div className="enter mx-auto max-w-2xl pt-10">
      <h1 className="page-title">Register your team</h1>
      <p className="page-sub">Three minutes, three steps. Payment happens securely via Razorpay at the end.</p>
      <Stepper current={Math.min(d.step, 2)} />
      <div className="stepbar mt-4" aria-hidden><div style={{ width: `${(Math.min(d.step, 2) / 2) * 100}%` }} /></div>
      {err && d.step < 2 && <div className="mt-4"><Alert kind="error">{err}</Alert></div>}

      {d.step === 0 && <TeamStep t={t} cfg={cfg} onChange={(p: any, rz: boolean) => { if (rz) { const m = Array.from({ length: p.teamSize }, (_, i) => d.members[i] || {}); set({ team: { ...t, ...p }, members: m }); } else set({ team: { ...t, ...p } }); }} onNext={() => { const m = validTeam(); if (m) setErr(m); else { setErr(''); setD(c => ({ ...c, step: 1 })); } }} />}

      {d.step === 1 && <MembersStep members={d.members} onChange={(i: number, k: string, v: string) => { const c = [...d.members]; c[i] = { ...c[i], [k]: v }; set({ members: c }); }} onBack={() => setD(c => ({ ...c, step: 0 }))} onNext={() => { const m = validMembers(); if (m) setErr(m); else { setErr(''); setD(c => ({ ...c, step: 2 })); } }} />}

      {d.step === 2 && <PayStep cfg={cfg} team={t} members={d.members} busy={busy} consent={consent} setConsent={setConsent} err={err} onBack={() => setD(c => ({ ...c, step: 1 }))} onPay={pay} />}
    </div>
  );
}
