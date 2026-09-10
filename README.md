# VISION X 2026 HACKATHON — Registration Platform

One-day, in-person hackathon site: team registration, admin-managed manual
UPI payments with admin verification, fraud screening, team dashboard with
check-in QR, admin command center, and automatic Excel sync. Built with
Next.js 14 + built-in Node SQLite (no external database service needed).

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
| `RAZORPAY_*` | Legacy, NOT used. The active flow needs no gateway keys — UPI ID + QR are set in Admin → Payment Settings |
| `FRAUD_AUTO_APPROVE_MAX_RISK` / `FRAUD_REVIEW_MIN_RISK` / `FRAUD_BLOCK_MIN_RISK` | Risk-score (0–100) thresholds for auto-approve / review / block |
| `EXCEL_EXPORT_PATH` / `EXCEL_SYNC_ENABLED` / `EXCEL_SYNC_MAX_RETRIES` / `EXCEL_STORAGE_PROVIDER` | Automatic Excel sync of registrations |
| Secrets live only in `.env.local` — never in frontend code. `.env.local` is git-ignored. |

## 4. Participant flow

- `/` — landing page: hero, entry fee / **venue** / team-size stats, format
  (`#about`), event **schedule** (`#schedule`, driven by Admin Settings), FAQ.
- `/register` — multi-step team signup (team → members → review → payment).
- `/payment` — manual UPI payment: scan the admin QR with any UPI app,
  note the red recipient-name notice, then submit the UTR (+ optional
  screenshot). Supports `/payment?id=REGID` resume from the register wizard.
- `/success` — receipt polling `/api/payments/status`; shows confirmed /
  under-review states.
- `/verify` — public QR / registration-ID verification for check-in desks.
- `/preview` — registration preview.

## Payment system (admin-managed UPI, no gateway)

Vision-X-Main uses an admin-managed UPI payment system instead of Razorpay:

- The admin configures a **UPI ID** and uploads a **UPI QR image** in
  Admin → Payment Settings (single active config in
  `settings.upi_id` / `settings.qr_image_path`).
- The payment page loads both live — never hardcoded — via
  `GET /api/payments/config` + `GET /api/payment-qr`.
- A red notice warns that the recipient name may appear as
  **Medical Agencies** (expected, safe to continue).
- The user submits the **UTR / UPI Ref No.** (+ optional PNG/JPG screenshot
  ≤ 2.5 MB). This records a payment *claim* (`REVIEW_REQUIRED`) — nothing
  auto-confirms. An admin VERIFYs/REJECTs it from `/admin/payments`
  (existing Verify/Reject/Review/Duplicate/Block actions).
- Duplicate UTRs across registrations are refused (409).
- Historical Razorpay columns/rows are preserved untouched; the
  Razorpay checkout, order/verify/webhook endpoints and gateway code were
  removed from the active flow.

### Admin configuration

1. Log in as Admin.
2. Open Admin Dashboard → **Payment Settings**.
3. Enter the UPI ID → Save UPI ID.
4. Upload the UPI QR image (PNG/JPG ≤ 3 MB). The old QR stays live until
   the new one is saved (safe replacement).
5. Open `/payment` and confirm the QR + UPI ID display correctly.

### User payment flow

1. User completes registration (team + members + consent).
2. User proceeds to Payment (`/payment?id=REGID`).
3. User scans the QR with any UPI app and completes the payment.
4. User reads the Medical Agencies notice and continues.
5. User enters the UTR and optionally attaches the screenshot, then submits.
6. Status becomes under-review; the receipt page tracks it until an admin
   verifies → CONFIRMED (or rejects).

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
| `/admin/payment-settings` | UPI ID + UPI QR image (live on the payment page instantly) |
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
src/app/register/                multi-step registration → /payment?id=
src/app/payment/page.tsx         manual UPI: QR + UPI ID + notice + UTR/screenshot proof
src/app/team/dashboard/page.tsx  team dashboard: QR + venue + Tirupati location
src/app/admin/settings/page.tsx  settings incl. visual schedule editor
src/app/admin/payment-settings/  UPI ID + QR upload UI
src/app/api/settings/route.ts    public config endpoint
src/app/api/admin/settings/      admin config endpoint
src/app/api/admin/payment-settings/  UPI config endpoints (GET/PUT + qr POST)
src/app/api/payments/config      public UPI config (upiId, qrImageUrl, fee)
src/app/api/payments/create      registration + PENDING upi_manual payment
src/app/api/payments/submit-proof  UTR/screenshot proof → REVIEW_REQUIRED
src/app/api/payment-qr           public active-QR image serving
src/lib/db.ts                    SQLite store + migrations (V1–V4)
src/lib/payment/upi.ts           UPI helpers (validation, QR lookup, image parsing)
src/lib/payment/payment-router.ts + state-machine.ts  status transitions (kept)
src/lib/fraud/                   risk engine + rules (kept, incl. duplicate UTR)
src/lib/excel/                   workbook + sync engine/queue
public/images/college.jpg        college photo (add manually, git-ignored pattern-free)
data/                            SQLite DB, uploads, workbook (git-ignored, local only)
scripts/init-db.mjs              DB initialisation helper
```

## 11. Deploy notes

- On hosts with ephemeral disks, mount a persistent volume at `./data`
  (SQLite DB, uploads — incl. the active UPI QR and payment screenshots —
  and the master workbook all live under `./data`).
- No payment-gateway keys are needed in any environment.
- `ADMIN_JWT_SECRET` / `TEAM_JWT_SECRET` must be long random strings in prod.

## 12. What's tracked in git

Committed: source (`src/`), `public/` (incl. `images/` folder; add
`college.jpg` yourself), `scripts/`, configs, `package.json`,
`package-lock.json`, `.env.example`, `README.md`, `data/uploads/.gitkeep`.
Ignored (local/generated/secret): `node_modules/`, `.next/`, `venv/`,
`*.tsbuildinfo`, `data/*.db*`, `data/*.xlsx`, `data/uploads/*` (except
`.gitkeep`), `.env`, `.env.local`.
