import { z } from 'zod';

export const phoneIN = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
export const emailS = z.string().email('Enter a valid email address');

export const teamInfoSchema = z.object({
  teamName: z.string().trim().min(3, 'Team name must be at least 3 characters').max(60),
  teamSize: z.number().int().min(1).max(6),
  leaderName: z.string().trim().min(3, 'Enter leader full name'),
  leaderEmail: emailS,
  leaderPhone: phoneIN,
  college: z.string().trim().default(''),
  department: z.string().trim().default(''),
  year: z.string().trim().default(''),
});

export const memberSchema = z.object({
  name: z.string().trim().min(2, 'Member name required'),
  rollNumber: z.string().trim().min(2, 'Roll number required'),
  email: emailS,
  phone: z.string().trim().default(''),
  college: z.string().default(''),
  department: z.string().default(''),
  year: z.string().default(''),
});

export function sanitize(s: unknown) {
  return String(s ?? '').trim().slice(0, 500);
}
export function normTxn(s: unknown) {
  return String(s ?? '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 64);
}
