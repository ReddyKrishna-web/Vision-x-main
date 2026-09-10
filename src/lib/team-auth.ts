import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

function scryptKey(pw: string, salt: Buffer, keyLen: number, opts?: { N: number; r: number; p: number }): Promise<Buffer> {
  const { N = 16384, r = 8, p = 1 } = opts || {};
  return new Promise((resolve, reject) => {
    _scrypt(pw, salt, keyLen, { N, r, p }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

export const TEAM_COOKIE = 'vx_team';
const TEAM_ROLE = 'team';

function teamSecret() {
  const s = process.env.TEAM_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'dev-secret-change-me-please-0000000000';
  return new TextEncoder().encode(s);
}

// ---------------------------------------------------------------------------
// Password policy (mirrors the spec: 8+ chars, upper, lower, number).
// ---------------------------------------------------------------------------
export function validateTeamPassword(pw: unknown): string {
  const s = String(pw ?? '');
  if (!s) return 'Please enter a password.';
  if (s.length < 8) return 'Please create a stronger password: at least 8 characters.';
  if (s.length > 128) return 'Password must be under 128 characters.';
  if (!/[A-Z]/.test(s)) return 'Please include at least one uppercase letter (A–Z).';
  if (!/[a-z]/.test(s)) return 'Please include at least one lowercase letter (a–z).';
  if (!/[0-9]/.test(s)) return 'Please include at least one number (0–9).';
  return '';
}

// ---------------------------------------------------------------------------
// Password hashing: Node native scrypt (memory-hard, no extra dependency).
// Stored format: scrypt$N$r$p$<saltB64>$<hashB64>. Never store raw passwords.
// ---------------------------------------------------------------------------
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export async function hashTeamPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptKey(pw, salt, KEY_LEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyTeamPassword(pw: string, stored: string): Promise<boolean> {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]); const r = Number(parts[2]); const p = Number(parts[3]);
    if (!N || !r || !p) return false;
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    const key = await scryptKey(String(pw || ''), salt, expected.length, { N, r, p });
    if (key.length !== expected.length) return false;
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Team session tokens (same architecture as the existing admin JWT auth).
// ---------------------------------------------------------------------------
export async function createTeamToken(registrationId: string) {
  return await new SignJWT({ registrationId, role: TEAM_ROLE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(teamSecret());
}

export async function createTeamResetToken(registrationId: string) {
  return await new SignJWT({ registrationId, role: TEAM_ROLE, purpose: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(teamSecret());
}

export async function verifyTeamToken(token: string): Promise<{ registrationId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, teamSecret());
    if ((payload as any).role !== TEAM_ROLE || (payload as any).purpose) return null;
    const id = String((payload as any).registrationId || '');
    if (!id) return null;
    return { registrationId: id };
  } catch {
    return null;
  }
}

export async function verifyTeamResetToken(token: string): Promise<{ registrationId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, teamSecret());
    if ((payload as any).role !== TEAM_ROLE || (payload as any).purpose !== 'password-reset') return null;
    const id = String((payload as any).registrationId || '');
    if (!id) return null;
    return { registrationId: id };
  } catch {
    return null;
  }
}

export async function currentTeam(): Promise<{ registrationId: string } | null> {
  try {
    const c = cookies().get(TEAM_COOKIE)?.value;
    if (!c) return null;
    return await verifyTeamToken(c);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Safe shapes — the password hash must NEVER leave the server.
// ---------------------------------------------------------------------------
const PUBLIC_REG_COLS = `registration_id, team_name, team_size, leader_name, leader_email,
  leader_phone, college, department, year, registration_status, flags,
  created_at, updated_at, confirmed_at,
  password_created, password_created_at, password_updated_at, last_login_at`;

export function getTeamPublic(registrationId: string): any | null {
  try {
    return db().prepare(`SELECT ${PUBLIC_REG_COLS} FROM registrations WHERE registration_id=?`).get(registrationId) as any;
  } catch {
    return null;
  }
}

// Strip credential columns from any registration row (e.g. admin SELECT * rows).
export function stripTeamSecrets<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const { team_password_hash, ...rest } = row as any;
  void team_password_hash;
  return rest as T;
}

export function maskEmail(email: string): string {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at <= 0) return '****';
  const user = s.slice(0, at);
  const dom = s.slice(at + 1);
  const head = user.length <= 2 ? user.slice(0, 1) + '*' : user.slice(0, 2) + '***';
  return `${head}@${dom}`;
}

export function maskPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '******' + digits.slice(-4);
}

export function normalizeId(id: unknown): string {
  return String(id ?? '').trim().slice(0, 32);
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
