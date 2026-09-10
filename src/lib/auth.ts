import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'vx_admin';
function secret() {
  const s = process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me-please-0000000000';
  return new TextEncoder().encode(s);
}
export async function createAdminToken(email: string) {
  return await new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}
export async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as { email: string; role: string };
}
export async function currentAdmin(): Promise<{ email: string } | null> {
  try {
    const c = cookies().get(COOKIE)?.value;
    if (!c) return null;
    const p = await verifyAdminToken(c);
    if (p.role !== 'admin') return null;
    return { email: p.email };
  } catch { return null; }
}
export async function requireAdmin() {
  const a = await currentAdmin();
  if (!a) { const e: any = new Error('Unauthorized'); e.status = 401; throw e; }
  return a;
}
export const ADMIN_COOKIE = COOKIE;
