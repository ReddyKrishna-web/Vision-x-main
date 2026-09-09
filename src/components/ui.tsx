import type { ReactNode } from 'react';

// Maps any registration/payment/fraud status to a quiet semantic pill.
// Text + square pixel dot: never color alone.
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

// Tiny pixel-ghost: the product's restrained playful signature.
// Used in empty states and (small) on success confirmations.
export function PixelGhost({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden shapeRendering="crispEdges">
      <rect x="4" y="2" width="8" height="2" fill="#8B5CF6" />
      <rect x="3" y="4" width="10" height="7" fill="#8B5CF6" />
      <rect x="5" y="6" width="2" height="2" fill="#0B0D12" />
      <rect x="9" y="6" width="2" height="2" fill="#0B0D12" />
      <rect x="3" y="11" width="2" height="2" fill="#8B5CF6" />
      <rect x="6" y="11" width="2" height="2" fill="#8B5CF6" />
      <rect x="9" y="11" width="2" height="2" fill="#8B5CF6" />
      <rect x="12" y="11" width="1" height="2" fill="#8B5CF6" />
      <rect x="5" y="6" width="1" height="1" fill="#F1F0EA" />
      <rect x="9" y="6" width="1" height="1" fill="#F1F0EA" />
    </svg>
  );
}

// Segmented pixel loading bar for verification / payment waits.
export function PxLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5" role="status" aria-live="polite">
      <span className="px-loader" aria-hidden>
        <span /><span /><span /><span />
      </span>
      {label && <span className="text-sm font-medium text-slate-400">{label}</span>}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <PixelGhost className="mx-auto h-12 w-12 opacity-80" />
      <p className="mt-3 font-sans text-sm font-semibold text-slate-200">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md font-sans text-sm text-slate-400">{body}</p>}
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
