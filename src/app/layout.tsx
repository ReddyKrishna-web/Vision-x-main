import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vision X 2026 — Hackathon Registration',
  description: 'Register your team for Vision X 2026. Simple signup, secure payment, confirmed in minutes.',
};

function MobileNav() {
  return (
    <details className="relative md:hidden">
      <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border border-ink/10 bg-white/80 text-xl text-ink [&::-webkit-details-marker]:hidden" aria-label="Open menu">
        ☰
      </summary>
      <div className="absolute right-0 top-12 w-56 rounded-2xl border border-ink/10 bg-white/95 p-2 shadow-pop backdrop-blur-xl">
        <Link href="/#about" className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-paper">About</Link>
        <Link href="/#schedule" className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-paper">Schedule</Link>
        <Link href="/#faq" className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink hover:bg-paper">FAQ</Link>
        <Link href="/admin/login" className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-paper">Admin</Link>
        <Link href="/team/login" className="block rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-paper">Team login</Link>
        <Link href="/register" className="btn-primary mt-1 w-full">Register</Link>
      </div>
    </details>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Cutive+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-void font-sans text-ink">
        <div className="bg-scene no-print" aria-hidden />
        <div className="bg-grid no-print" aria-hidden />
        <header className="no-print sticky top-3 z-40 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between rounded-[20px] border border-ink/[0.07] bg-white/75 px-3 shadow-card backdrop-blur-xl sm:px-4">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Vision X home">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-ink font-display text-base font-bold text-white transition-transform duration-200 group-hover:-rotate-6 group-hover:bg-accent" aria-hidden>
                X
              </span>
              <span className="font-display text-[17px] font-bold tracking-tight">
                Vision X <span className="rounded-full bg-lime px-2 py-0.5 text-[12px] font-bold">2026</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-semibold text-ink-soft md:flex" aria-label="Primary">
              <Link href="/#about" className="rounded-xl px-4 py-2 transition hover:bg-paper hover:text-ink">About</Link>
              <Link href="/#schedule" className="rounded-xl px-4 py-2 transition hover:bg-paper hover:text-ink">Schedule</Link>
              <Link href="/#faq" className="rounded-xl px-4 py-2 transition hover:bg-paper hover:text-ink">FAQ</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/team/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink sm:block">Team login</Link>
              <Link href="/admin/login" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink sm:block">Admin</Link>
              <Link href="/register" className="btn-primary hidden !px-5 !py-2.5 md:inline-flex">Register <span className="arr">→</span></Link>
              <MobileNav />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">{children}</main>
        <footer className="no-print border-t border-ink/10 bg-white/60 backdrop-blur">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-ink font-display text-base font-bold text-white">X</span>
                <span className="font-display text-lg font-bold">Vision X 2026</span>
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
                One day, one prototype, one demo. Bring a team, pick a problem, and ship something unreasonable.
              </p>
              <p className="meta mt-4">© {new Date().getFullYear()} Vision X Hackathon · Made for builders</p>
            </div>
            <nav aria-label="Explore">
              <p className="metric-label">Explore</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold">
                <li><Link className="text-ink-soft hover:text-ink" href="/#about">About the format</Link></li>
                <li><Link className="text-ink-soft hover:text-ink" href="/#schedule">Schedule</Link></li>
                <li><Link className="text-ink-soft hover:text-ink" href="/#faq">FAQ</Link></li>
                <li><Link className="text-ink-soft hover:text-ink" href="/register">Register</Link></li>
                <li><Link className="text-ink-soft hover:text-ink" href="/team/login">Team login</Link></li>
              </ul>
            </nav>
            <nav aria-label="Organisers">
              <p className="metric-label">Organisers</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold">
                <li><Link className="text-ink-soft hover:text-ink" href="/admin/login">Admin sign in</Link></li>
                <li><Link className="text-ink-soft hover:text-ink" href="/#faq">Contact & help</Link></li>
              </ul>
              <Link href="/register" className="btn-lime mt-5 !px-5 !py-2.5 text-sm">Get your spot →</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
