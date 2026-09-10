'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui';

// Shared shell so Team Login / Setup / Forgot feel native to Vision-X-Main.
export function TeamShell({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub?: string; children: ReactNode }) {
  return (
    <div className="enter mx-auto max-w-md pt-12">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink font-display text-lg font-bold text-white">X</span>
        <p className="eyebrow mt-4 justify-center">{eyebrow}</p>
        <h1 className="page-title mt-2">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      <div className="card mt-6">{children}</div>
      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link href="/" className="link text-sm">← Back to home</Link>
      </p>
    </div>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="input pr-16"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 font-sans text-xs font-bold text-accent-deep hover:bg-accent/10"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export function FormError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="mb-4"><Alert kind="error">{msg}</Alert></div>;
}

export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter, and a number.';
