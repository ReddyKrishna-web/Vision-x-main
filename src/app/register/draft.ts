'use client';
export const KEY = 'vx_draft_v1';
export type Draft = { step: number; team: any; members: any[]; pay: any };
export function loadDraft(): Draft {
  try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { step: d.step || 0, team: d.team || {}, members: d.members || [], pay: d.pay || {} }; }
  catch { return { step: 0, team: {}, members: [], pay: {} }; }
}
export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
export const phoneOk = (p: string) => /^[6-9]\d{9}$/.test(p || '');
