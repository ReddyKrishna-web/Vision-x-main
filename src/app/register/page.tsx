'use client';
import { useRegister } from './useRegister';
import { TeamStep } from './TeamStep';
import { MembersStep, PayStep } from './steps';
import { Alert } from '@/components/ui';

const STEPS = ['Team', 'Members', 'Payment'];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper mt-6" aria-label="Registration progress">
      {STEPS.map((s, i) => (
        <li key={s} className={`step-item ${i === current ? 'step-active' : i < current ? 'step-done' : 'step-todo'}`}>
          <span className="step-num" aria-hidden>{i < current ? '✓' : i + 1}</span>
          <span className="step-name">{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 font-bold text-ink/20" aria-hidden>→</span>}
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
      <div className="text-center">
        <p className="eyebrow justify-center">Vision X 2026 · Registration</p>
        <h1 className="page-title mt-2 !text-4xl sm:!text-5xl">Register your team 🎉</h1>
        <p className="page-sub mx-auto max-w-md">Three minutes, three steps. Payment happens via UPI at the end.</p>
      </div>
      <div className="card-flat mt-6 !rounded-[20px]">
        <Stepper current={Math.min(d.step, 2)} />
        <div className="stepbar mt-4" role="progressbar" aria-valuenow={Math.min(d.step, 2)} aria-valuemin={0} aria-valuemax={2} aria-hidden={false}><div style={{ width: `${(Math.min(d.step, 2) / 2) * 100}%` }} /></div>
      </div>
      {err && d.step < 2 && <div className="mt-4"><Alert kind="error">{err}</Alert></div>}

      {d.step === 0 && <TeamStep t={t} cfg={cfg} onChange={(p: any, rz: boolean) => { if (rz) { const m = Array.from({ length: p.teamSize }, (_, i) => d.members[i] || {}); set({ team: { ...t, ...p }, members: m }); } else set({ team: { ...t, ...p } }); }} onNext={() => { const m = validTeam(); if (m) setErr(m); else { setErr(''); setD(c => ({ ...c, step: 1 })); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} />}

      {d.step === 1 && <MembersStep members={d.members} onChange={(i: number, k: string, v: string) => { const c = [...d.members]; c[i] = { ...c[i], [k]: v }; set({ members: c }); }} onBack={() => setD(c => ({ ...c, step: 0 }))} onNext={() => { const m = validMembers(); if (m) setErr(m); else { setErr(''); setD(c => ({ ...c, step: 2 })); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} />}

      {d.step === 2 && <PayStep cfg={cfg} team={t} members={d.members} busy={busy} consent={consent} setConsent={setConsent} err={err} onBack={() => setD(c => ({ ...c, step: 1 }))} onPay={pay} />}
    </div>
  );
}
