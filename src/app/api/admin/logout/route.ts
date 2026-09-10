import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';
export async function GET() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return r;
}
