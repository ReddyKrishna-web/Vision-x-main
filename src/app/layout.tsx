import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vision X 2026 — Hackathon Registration',
  description: 'Register your team for Vision X 2026. Simple signup, secure payment, confirmed in minutes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cutive+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-void font-sans text-slate-100">
        <div className="bg-scene no-print" aria-hidden />
        <header className="sticky top-0 z-40 border-b border-white/10 bg-void/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Vision X home">
              <span className="px-corners grid h-8 w-8 place-items-center bg-accent font-mono text-sm text-ink transition-colors group-hover:bg-accent-soft" aria-hidden>X</span>
              <span className="font-mono text-[15px] tracking-wide">Vision X <span className="text-slate-500">2026</span></span>
            </Link>
            <nav className="hidden items-center gap-1 font-mono text-[13px] tracking-wide text-slate-400 md:flex" aria-label="Primary">
              <Link href="/#about" className="rounded px-3 py-2 transition duration-150 hover:bg-white/5 hover:text-slate-100">About</Link>
              <Link href="/#schedule" className="rounded px-3 py-2 transition duration-150 hover:bg-white/5 hover:text-slate-100">Schedule</Link>
              <Link href="/#faq" className="rounded px-3 py-2 transition duration-150 hover:bg-white/5 hover:text-slate-100">FAQ</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/admin/login" className="hidden rounded px-3 py-2 font-mono text-[13px] tracking-wide text-slate-400 transition duration-150 hover:bg-white/5 hover:text-slate-100 sm:block">Admin</Link>
              <Link href="/register" className="btn-primary !px-4 !py-2 font-sans text-sm">Register</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">{children}</main>
        <footer className="border-t border-white/10 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 font-sans text-sm text-slate-500 sm:flex-row sm:px-6">
            <p className="flex items-center gap-2"><span className="px-tick" aria-hidden /> © {new Date().getFullYear()} Vision X Hackathon</p>
            <p>Questions? <Link className="link" href="/#faq">Read the FAQ</Link></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
