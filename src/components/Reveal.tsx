'use client';
import { useEffect, useRef, type ReactNode } from 'react';

// Fade-up-on-scroll wrapper. Adds `.revealed` once the element enters view.
// Honours prefers-reduced-motion via CSS. No dependencies.
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: 0 | 1 | 2 | 3 }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('revealed'); return; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { el.classList.add('revealed'); io.disconnect(); }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const d = delay === 1 ? 'reveal-d1' : delay === 2 ? 'reveal-d2' : delay === 3 ? 'reveal-d3' : '';
  return <div ref={ref} className={`reveal ${d} ${className}`}>{children}</div>;
}
