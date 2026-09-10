import type { ReactNode } from 'react';

// Maps any registration/payment/fraud status to a soft semantic pill.
export function statusTone(s: string): 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent' {
  const v = String(s || '').toUpperCase();
  if (['CONFIRMED', 'VERIFIED', 'SUCCESS', 'CLEAR'].includes(v)) return 'ok';
  if (['REJECTED', 'FAILED', 'FRAUD_BLOCKED', 'BLOCKED', 'FRAUD_HOLD'].includes(v)) return 'bad';
  if (['REVIEW_REQUIRED', 'UNDER_REVIEW', 'MANUAL_REVIEW', 'OCR_DETECTED', 'REVIEW', 'MONITOR'].includes(v)) return 'warn';
  if (['PROCESSING', 'VERIFYING', 'PAID', 'PENDING_PAYMENT'].includes(v)) return 'info';
  if (['DUPLICATE'].includes(v)) return 'accent';
  return 'neutral';
}

const tones: Record<string, string> = {
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  info: 'badge-info',
  neutral: 'badge-neutral',
  accent: 'badge-accent',
};

export function prettyStatus(s: string): string {
  const v = String(s || 'PENDING');
  return v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span className={`badge ${tones[tone]} ${className}`}>
      <span className="dot" aria-hidden />
      {prettyStatus(status)}
    </span>
  );
}

// Friendly pixel-spark mascot — soft, playful signature for empty/success states.
export function PixelGhost({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden shapeRendering="crispEdges">
      <rect x="4" y="2" width="8" height="2" rx="1" fill="#6C4CF1" />
      <rect x="3" y="4" width="10" height="7" rx="2" fill="#6C4CF1" />
      <rect x="5" y="6" width="2" height="2" fill="#1D152E" />
      <rect x="9" y="6" width="2" height="2" fill="#1D152E" />
      <rect x="3" y="11" width="2" height="2" fill="#6C4CF1" />
      <rect x="6" y="11" width="2" height="2" fill="#6C4CF1" />
      <rect x="9" y="11" width="2" height="2" fill="#D9F450" />
      <rect x="12" y="11" width="1" height="2" fill="#6C4CF1" />
      <rect x="5" y="6" width="1" height="1" fill="#fff" />
      <rect x="9" y="6" width="1" height="1" fill="#fff" />
    </svg>
  );
}

export function PxLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-3" role="status" aria-live="polite">
      <span className="px-loader" aria-hidden>
        <span /><span /><span /><span />
      </span>
      {label && <span className="text-sm font-medium text-ink-soft">{label}</span>}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent/10">
        <PixelGhost className="h-9 w-9" />
      </div>
      <p className="mt-4 font-display text-base font-bold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md font-sans text-sm leading-relaxed text-ink-soft">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'warn' | 'info' | 'ok'; children: ReactNode }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

// Small soft stat tile used across admin + landing
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="metric-label">{label}</p>
      <p className="metric-value !text-2xl">{value}</p>
    </div>
  );
}
