# VISION X 2026 HACKATHON — Registration Platform

One-day, in-person hackathon site: team registration, Razorpay payments with
server-side verification, fraud screening, team dashboard with check-in QR,
admin command center, and automatic Excel sync. Built with Next.js 14 +
built-in Node SQLite (no external database service needed).

## 1. Install

```
npm install
cp .env.example .env.local   # then fill in ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_JWT_SECRET
npm run db:init               # optional: initialise data/visionx.db
```

## 2. Run

```
npm run dev    # http://localhost:30001
npm run build  # production build
npm start      # production server on :30001
npm run lint   # lint
```

## 3. Environment (.env.local)

Copy `.env.example` to `.env.local`. What each key does:

| Key | Purpose |
| --- | ------- |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login (`/admin/login`) |
| `ADMIN_JWT_SECRET` | Signs admin sessions (min 32 chars). Also falls back for team sessions |
| `TEAM_JWT_SECRET` | Signs team sessions (falls back to `ADMIN_JWT_SECRET` when empty) |
| `OCRSPACE_API_KEY` | Optional OCR.space key for payment-screenshot accuracy; built-in tesseract.js is used when empty |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Optional confirmation emails; everything fails gracefully when empty |
| `NEXT_PUBLIC_HACKATHON_NAME` | Public default event name (overridable from Admin Settings UI) |
| `RAZORPAY_KEY_ID/KEY_SECRET` | Server-only Razorpay keys — test keys (`rzp_test_…`) for dev, live keys only in prod. Never `NEXT_PUBLIC_` |
| `RAZORPAY_WEBHOOK_SECRET` | Required only if Razorpay webhooks are enabled. Register events URL: `https://your-domain/api/payments/webhook/razorpay` |
| `FRAUD_AUTO_APPROVE_MAX_RISK` / `FRAUD_REVIEW_MIN_RISK` / `FRAUD_BLOCK_MIN_RISK` | Risk-score (0–100) thresholds for auto-approve / review / block |
| `EXCEL_EXPORT_PATH` / `EXCEL_SYNC_ENABLED` / `EXCEL_SYNC_MAX_RETRIES` / `EXCEL_STORAGE_PROVIDER` | Automatic Excel sync of registrations |
| Secrets live only in `.env.local` — never in frontend code. `.env.local` is git-ignored. |

## 4. Participant flow

- `/` — landing page: hero, entry fee / **venue** / team-size stats, format
  (`#about`), event **schedule** (`#schedule`, driven by Admin Settings), FAQ.
- `/register` — multi-step team signup (team → members → review → payment).
- `/payment` → `/success` — Razorpay checkout, server-verified; receipt and
  registration ID issued only after verification.
- `/verify` — public QR / registration-ID verification for check-in desks.
- `/preview` — registration preview.

## 5. Team dashboard (`/team/*`)

- `/team/login`, `/team/setup` (first-time password), `/team/forgot` (reset).
- `/team/dashboard` — after login each team sees:
  - **Team information** (name, size, status, payment, college) and leader/members.
  - **Check-in QR 🎟️** — teams show this at the venue for fast check-in.
  - **Venue 🏛️** — `Annamayya Auditorium` (editable in Admin Settings).
  - **Location 📍** — college photo, `Annamacharya Institute of Technology And
    Sciences`, address `Venkatapuram Village, Renigunta Mandal, Tirupati,
    Andhra Pradesh 517520`, embedded Google Map + **Get directions** link.

## 6. Admin (`/admin/*`)

Login at `/admin/login`, then:

| Page | What it does |
| ---- | ------------ |
| `/admin/dashboard` | Overview stats + recent registrations |
| `/admin/registrations` (+ `/[id]`) | Browse, inspect, verify/reject/flag teams |
| `/admin/payments` | Revenue, verification queue, fraud review |
| `/admin/export` | Download `.xlsx` — ALL / VERIFIED / PENDING / REJECTED / DUPLICATE |
| `/admin/data-sync` | Excel auto-sync jobs, retries |
| `/admin/audit` | Audit log of admin actions |
| `/admin/settings` | Everything participants see (see below) |

### Admin Settings fields

Event name, description, entry fee, team size limits, registrations
open/closed + dates, **venue**, **location name**, **location address**,
**map embed URL**, **map directions link**, contact email/phone, rules,
eligibility, registration-ID prefix — plus the **event schedule editor**.

### Schedule editor → landing page

`/admin/settings` has a visual schedule editor (time / title / description
rows with add, remove, reorder) plus an "Edit as JSON" mode. Saving writes
`schedule_json`, which `GET /api/settings` serves — the landing-page
`#schedule` section updates instantly with no redeploy.

## 7. Venue & college photo

Canonical values (seeded by DB migration V4, editable in Admin Settings):

- Venue: `Annamayya Auditorium`
- Location: `Annamacharya Institute of Technology And Sciences`
- Address: `Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520`
- Map: Google Maps embed (`maps?q=…&output=embed`) + directions link
  (`maps/search/?api=1&query=…`) for the Tirupati campus.

The dashboard Location card displays `/images/college.jpg`. To use the
college photo: save it as `public/images/college.jpg` and restart the dev
server. (The card hides the photo gracefully until the file exists.)

## 8. Data & storage notes

- DB: built-in Node SQLite at `data/visionx.db` (WAL mode). Schema +
  migrations live in `src/lib/db.ts` (V1 base → V2 payments/fraud/Excel →
  V3 team login → V4 venue/Tirupati location). Swap to Postgres/Supabase
  later via `src/lib/db.ts`.
- Uploads (payment screenshots) are stored privately in `data/uploads/` and
  served only to admins via `/api/uploads/[id]`.
- The master workbook (`EXCEL_EXPORT_PATH`, default
  `./data/vision-x-registrations.xlsx`) is regenerated/synced automatically.
- OCR: built-in tesseract.js; set `OCRSPACE_API_KEY` for higher screenshot
  accuracy (optional).
- Email: set `SMTP_*` to enable confirmation mails; fails gracefully if empty.

## 9. Key API routes

- `GET /api/settings` — public site config (fee, venue, location, schedule…).
- `GET/PUT /api/admin/settings` — read/update site config (admin auth).
- `/api/admin/{stats,registrations,payments,export,sync,detail,audit,login,logout}`.
- `/api/team/{login,logout,me,qr,lookup,setup-password,forgot-verify,forgot-reset}`.
- `/api/payments/{create,order,verify,status,config}` + Razorpay webhook.
- `GET /api/uploads/[id]` — admin-only screenshot serving.

## 10. Project structure

```
src/app/page.tsx                 landing page (fee, venue, schedule, FAQ)
src/app/register/                multi-step registration
src/app/team/dashboard/page.tsx  team dashboard: QR + venue + Tirupati location
src/app/admin/settings/page.tsx  settings incl. visual schedule editor
src/app/api/settings/route.ts    public config endpoint
src/app/api/admin/settings/      admin config endpoint
src/lib/db.ts                    SQLite store + migrations (V1–V4)
src/lib/payment/                 Razorpay router, verification, state machine
src/lib/fraud/                   risk engine + rules
src/lib/excel/                   workbook + sync engine/queue
public/images/college.jpg        college photo (add manually, git-ignored pattern-free)
data/                            SQLite DB, uploads, workbook (git-ignored, local only)
scripts/init-db.mjs              DB initialisation helper
```

## 11. Deploy notes

- On hosts with ephemeral disks, mount a persistent volume at `./data`
  (SQLite DB, uploads, and the master workbook all live under `./data`).
- Set live Razorpay keys + webhook secret only in production env.
- `ADMIN_JWT_SECRET` / `TEAM_JWT_SECRET` must be long random strings in prod.

## 12. What's tracked in git

Committed: source (`src/`), `public/` (incl. `images/` folder; add
`college.jpg` yourself), `scripts/`, configs, `package.json`,
`package-lock.json`, `.env.example`, `README.md`, `data/uploads/.gitkeep`.
Ignored (local/generated/secret): `node_modules/`, `.next/`, `venv/`,
`*.tsbuildinfo`, `data/*.db*`, `data/*.xlsx`, `data/uploads/*` (except
`.gitkeep`), `.env`, `.env.local`.
