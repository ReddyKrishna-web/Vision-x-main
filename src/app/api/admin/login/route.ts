import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, createAdminToken } from '@/lib/auth';
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (String(email || '').toLowerCase() === String(process.env.ADMIN_EMAIL || 'admin@visionx.hack').toLowerCase()
    && String(password || '') === String(process.env.ADMIN_PASSWORD || 'VisionX!2026')) {
    const token = await createAdminToken(String(email));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
    return res;
  }
  return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
}
