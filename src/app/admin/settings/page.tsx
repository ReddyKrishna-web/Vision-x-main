'use client';
import { useEffect, useState } from 'react';

const FIELD_LABELS: Record<string, string> = {
  hackathon_name: 'Event name', description: 'Description', registration_fee: 'Entry fee (Rs.)',
  min_team_size: 'Minimum team size', max_team_size: 'Maximum team size',
  reg_open: 'Registrations', reg_start: 'Opens on', reg_end: 'Closes on', venue: 'Venue',
  location_name: 'Location name', location_address: 'Location address',
  map_embed_url: 'Map embed URL', map_link: 'Map directions link',
  contact_email: 'Contact email', contact_phone: 'Contact phone', rules: 'Rules', eligibility: 'Eligibility',
  reg_prefix: 'Registration ID prefix',
};
const FIELDS = Object.keys(FIELD_LABELS);
const WIDE = new Set(['description', 'rules', 'eligibility', 'location_address', 'map_embed_url', 'map_link']);

type SchedItem = { time: string; title: string; desc: string };

function parseSchedule(raw: string): SchedItem[] {
  try {
    const v = JSON.parse(raw || '[]');
    if (!Array.isArray(v)) return [];
    return v.map((s: any) => ({ time: String(s?.time ?? ''), title: String(s?.title ?? ''), desc: String(s?.desc ?? '') }));
  } catch { return []; }
}

export default function SettingsPage() {
  const [f, setF] = useState<any>({});
  const [items, setItems] = useState<SchedItem[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [raw, setRaw] = useState('[]');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((j) => {
      setF(j);
      const list = parseSchedule(j.schedule_json || '[]');
      setItems(list);
      setRaw(JSON.stringify(list, null, 2));
    });
  }, []);

  function syncItems(next: SchedItem[]) {
    setItems(next);
    setRaw(JSON.stringify(next, null, 2));
  }
  function updateItem(i: number, patch: Partial<SchedItem>) {
    syncItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    syncItems(next);
  }
  function removeItem(i: number) {
    syncItems(items.filter((_, idx) => idx !== i));
  }
  function addItem() {
    syncItems([...items, { time: '', title: '', desc: '' }]);
  }

  async function save() {
    setMsg('');
    setSaving(true);
    try {
      let schedule_json: string;
      if (rawMode) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Schedule must be a JSON array.');
        schedule_json = JSON.stringify(parsed);
      } else {
        schedule_json = JSON.stringify(items);
      }
      const r = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, schedule_json }),
      });
      setMsg(r.ok ? 'Settings saved — landing page schedule updated.' : 'Could not save — please try again.');
    } catch {
      setMsg('Schedule is not valid JSON — fix it before saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="enter mx-auto max-w-3xl pt-10">
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">These control what participants see on the site — venue, location map, and the landing-page schedule. Payments are processed via Razorpay.</p>
      <div className="card mt-5 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((k) => (
          <div key={k} className={WIDE.has(k) ? 'sm:col-span-2' : ''}>
            <label className="label" htmlFor={'s-' + k}>{FIELD_LABELS[k]}</label>
            {k === 'reg_open'
              ? <select id={'s-' + k} className="input" value={String(f[k] ?? 1)} onChange={e => setF({ ...f, [k]: Number(e.target.value) })}><option value="1">Open</option><option value="0">Closed</option></select>
              : k === 'location_address'
                ? <textarea id={'s-' + k} className="input h-20" value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder="Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520" />
                : <input id={'s-' + k} className="input" value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={k === 'venue' ? 'Annamayya Auditorium' : k === 'location_name' ? 'Annamacharya Institute of Technology And Sciences' : undefined} />}
            {(k === 'map_embed_url' || k === 'map_link') && (
              <p className="hint">Paste a Google Maps {k === 'map_embed_url' ? 'embed (…/maps?q=…&output=embed)' : 'directions link (…/maps/search/?api=1&query=…)'} URL.</p>
            )}
          </div>
        ))}

        <div className="sm:col-span-2 rounded-2xl border border-ink/[0.07] bg-paper/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="label !mb-0">Event schedule <span className="font-normal text-ink-muted">— updates instantly on the landing page</span></label>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => {
              if (rawMode) { setItems(parseSchedule(raw)); }
              else { setRaw(JSON.stringify(items, null, 2)); }
              setRawMode(!rawMode);
            }}>
              {rawMode ? 'Use visual editor' : 'Edit as JSON'}
            </button>
          </div>

          {rawMode ? (
            <textarea
              aria-label="Schedule JSON"
              className="input mt-3 h-40 font-mono text-[13px]"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder='[{"time":"09:00 – 09:30","title":"Check-in","desc":"…"}]'
            />
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((s, i) => (
                <div key={i} className="grid gap-2 rounded-2xl border border-ink/[0.07] bg-white p-3 sm:grid-cols-[130px_1fr] sm:gap-3">
                  <div>
                    <label className="label" htmlFor={`sched-time-${i}`}>Time</label>
                    <input id={`sched-time-${i}`} className="input" value={s.time} onChange={e => updateItem(i, { time: e.target.value })} placeholder="09:00 – 09:30" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="label" htmlFor={`sched-title-${i}`}>Title</label>
                      <input id={`sched-title-${i}`} className="input" value={s.title} onChange={e => updateItem(i, { title: e.target.value })} placeholder="Check-in" />
                    </div>
                    <div>
                      <label className="label" htmlFor={`sched-desc-${i}`}>Description</label>
                      <input id={`sched-desc-${i}`} className="input" value={s.desc} onChange={e => updateItem(i, { desc: e.target.value })} placeholder="Badges, kits and verification…" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0}>↑ Up</button>
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓ Down</button>
                      <button type="button" className="btn-ghost !px-3 !py-1 text-xs !text-danger" onClick={() => removeItem(i)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-ink-muted">No schedule rows yet — add the first one below.</p>}
              <button type="button" className="btn-ghost !px-4 !py-2 text-sm" onClick={addItem}>+ Add schedule row</button>
            </div>
          )}
          <p className="hint mt-2">Saved schedule appears in the “Schedule” and “Venue & location” sections of the landing page.</p>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          {msg && <span className={`text-sm ${msg.includes('Could not') || msg.includes('not valid') ? 'text-danger' : 'text-mint'}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
