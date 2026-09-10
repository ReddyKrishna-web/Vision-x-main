# Vision-X-Main

Hackathon registration platform for **Vision X 2026** (Annamacharya Institute
of Technology And Sciences, Tirupati). Teams register online, pay the entry
fee via an admin-managed UPI QR, get a check-in QR, and organizers verify
teams and track everything in an auto-synced Excel workbook.

## 2. Project overview

Vision-X-Main solves event-day chaos: one site where students form teams and
pay, teams manage their own check-in QR, and admins verify payments and
registrations from a command center — with every transaction mirrored into a
master Excel sheet automatically.

Primary users: **student teams** (register, pay, check in) and **organizers /
admins** (verify payments, manage registrations, export reports).

## 3. Features

### Registration & team management

- 3-step team registration (team → members → review → payment), 1–6 members
  (size limits configurable).
- Team leader + per-member details: name, roll number, email, phone,
  **college, department, academic year** (1st–4th Year dropdown; each member
  has their own values).
- Server-side validation (zod) + client-side checks; progress drafts saved
  in the browser.

### Authentication

- Team login with Registration ID + password; first-time password setup and
  forgot-password reset via admin-assisted verify flow.
- Passwords stored only as scrypt hashes; sessions are JWT cookies
  (`vx_team`); admin area guarded by JWT cookie (`vx_admin`) + middleware.

### Dashboards

- **Team dashboard**: team info, leader/members (with academic details),
  check-in QR, venue (`Annamayya Auditorium`), Tirupati college location
  with photo, embedded map and directions.
- **Admin dashboard**: totals, review queue, recent registrations, Excel
  sync health; sections for Registrations, Payments, Payment Settings,
  Excel sync, Export, Audit, Settings.

### Payments (admin-managed UPI, no gateway)

- Admin configures one **UPI ID** + uploads one **UPI QR image** in
  Admin → Payment Settings (stored in `settings.upi_id` /
  `settings.qr_image_path`, live instantly).
- Payment page shows the QR (scannable, responsive), UPI ID with copy
  button, and a red notice that the recipient name may appear as
  **Medical Agencies** (expected).
- Payer submits the **UTR / UPI Ref No.** (+ optional screenshot) →
  `REVIEW_REQUIRED`; admin VERIFYs → `CONFIRMED` (or REJECTs). Nothing
  auto-confirms; duplicate UTRs across teams are refused.

### QR functionality

- Each team gets a unique check-in QR (`/api/team/qr`, `qrcode` lib).
- Public `/verify?id=` page shows team + payment status for check-in desks
  (confirmed → cleared for check-in).

### Excel integration

- Every registration/payment/admin status change triggers a background sync
  job (`triggerSync` → `excel_sync_jobs` → `syncRegistrationToWorkbook`).
- Master workbook (`data/vision-x-registrations.xlsx`): Registrations, Team
  Members, Payments, Fraud Review, Sync Log sheets — incl. academic columns.
- Upserts keyed by registration ID (never duplicates), atomic tmp+rename
  writes, retry queue, startup recovery. No manual download needed.

## 4. Technology stack

| Layer | Actual stack (from `package.json`) |
| --- | --- |
| Frontend | Next.js 14.2.5 (App Router), React 18.3.1, Tailwind CSS 3.4.6, TypeScript 5.5.3 |
| Backend | Next.js Route Handlers on Node.js (`runtime = 'nodejs'`), zod 3.23.8 validation, jose 5.9.3 JWT |
| Database | Built-in Node SQLite (`node:sqlite`, WAL mode) at `data/visionx.db`; migrations in `src/lib/db.ts` |
| Storage | Local files under `data/` (DB, `uploads/`, workbook); `EXCEL_STORAGE_PROVIDER=local` |
| QR / OCR / Excel | `qrcode` 1.5.4, `tesseract.js` 5.1.1 (+ optional OCR.space key), `exceljs` 4.4.0 |
| Testing | No unit/e2e suites; `playwright-core` is used only by the dev screenshot harness `scripts/shots.cjs`; verification via `tsc`, `next build`, manual API tests |
| CI/CD | None (no workflows, no Docker) |

## 5. Project architecture

Monolith: Next.js serves pages and same-origin JSON APIs; APIs read/write
SQLite; files live under `data/`; Excel sync runs in-process (serialized
mutex, fire-and-forget jobs).

```
Browser (pages) → Next.js API routes → SQLite (data/visionx.db)
                                              ↓ fire-and-forget jobs
                                   Master Excel (data/*.xlsx)
                        uploads (data/uploads) → served to admin / public QR
```

No external payment gateway, no cloud services required; email/OCR are
optional and fail gracefully.

## 6. Project structure

```
src/app/page.tsx                 landing (fee, venue, schedule, FAQ)
src/app/register/                wizard: TeamStep, MembersStep/PayStep, useRegister, draft
src/app/payment/page.tsx         manual UPI: QR + UPI ID + notice + UTR/screenshot
src/app/success/page.tsx         receipt polling /api/payments/status
src/app/verify/page.tsx          public check-in verification
src/app/team/*/                  login, setup, forgot, dashboard (+ _components)
src/app/admin/*/                 dashboard, registrations, payments,
                                 payment-settings, settings, export,
                                 data-sync, audit, login
src/app/api/payments/            create, submit-proof, config, status
src/app/api/payment-qr/          public active-QR image
src/app/api/team/                login/logout/me/qr/lookup/setup-password/forgot-*
src/app/api/admin/               login/logout/stats/registrations/payments/
                                 payment-settings/settings/export/sync/detail/audit
src/app/api/settings/            public site config
src/app/api/uploads/[id]/        private file serving (admin QR proofs)
src/lib/db.ts                    SQLite + migrations V1–V4, settings, audit, IDs
src/lib/validators.ts            zod schemas, academic options
src/lib/auth.ts | team-auth.ts   admin JWT / team scrypt+JWT, password policy
src/lib/payment/upi.ts           UPI config + image validation (no gateway code)
src/lib/payment/router+machine   status transitions for admin review
src/lib/fraud/                   risk engine (duplicates, velocity, identifiers)
src/lib/excel/                   workbook upsert, sync queue/engine
src/lib/ocr.ts | rate-limit.ts   screenshot OCR helper, in-memory rate limits
src/components/                  ui.tsx primitives, Reveal.tsx
scripts/init-db.mjs              create DB | shots.cjs  dev screenshot harness
public/images/                   college photo (add college.jpg manually)
```

## 7. Installation & local development

Verified steps (Node 20+):

```bash
git clone https://github.com/ReddyKrishna-web/Vision-x-main.git
cd Vision-x-main
npm install
cp .env.example .env.local   # fill ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_JWT_SECRET
npm run db:init              # optional; app migrates automatically on boot
npm run dev                  # http://localhost:30001
```

Then: Admin → Payment Settings → set UPI ID + upload QR; register a test
team at `/register` to exercise the full flow.

## 8. Environment variables

All names from `.env.example` (placeholders only — never commit real values;
`.env.local` is git-ignored):

```env
ADMIN_EMAIL=you@example.org
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_JWT_SECRET=at-least-32-random-characters
TEAM_JWT_SECRET=another-long-random-secret   # falls back to ADMIN_JWT_SECRET
OCRSPACE_API_KEY=                            # optional, else built-in tesseract.js
SMTP_HOST=  SMTP_PORT=587  SMTP_USER=  SMTP_PASS=  SMTP_FROM=
NEXT_PUBLIC_HACKATHON_NAME="VISION X 2026 HACKATHON"
# Payments need NO gateway keys: UPI ID + QR live in Admin → Payment Settings.
# RAZORPAY_* keys are legacy and unused (left commented in .env.example).
FRAUD_AUTO_APPROVE_MAX_RISK=29  FRAUD_REVIEW_MIN_RISK=60  FRAUD_BLOCK_MIN_RISK=80
EXCEL_EXPORT_PATH=./data/vision-x-registrations.xlsx
EXCEL_SYNC_ENABLED=true  EXCEL_SYNC_MAX_RETRIES=5  EXCEL_STORAGE_PROVIDER=local
```

## 9. Registration workflow

1. Team step: name, size, leader name/email/phone/college/department/year.
2. Members step: per member name, roll number, email + own
   college/department/year (members may differ).
3. Review + consent → `POST /api/payments/create` validates (zod), saves
   registration (`PENDING_PAYMENT`) + payment row (`PENDING`,
   `provider=upi_manual`), enqueues Excel sync → redirects to
   `/payment?id=REGID`. Same endpoint backs the standalone `/payment` form.

## 10. Payment workflow

1. Admin sets UPI ID + QR in Payment Settings (safe replacement; old QR
   stays live until the new upload saves).
2. User opens `/payment?id=REGID`: sees amount, live QR
   (`GET /api/payment-qr`), UPI ID + copy, red Medical Agencies notice.
3. User pays in their own UPI app, enters the UTR (+ optional PNG/JPG
   screenshot ≤ 2.5 MB) → `POST /api/payments/submit-proof`.
4. Server validates, refuses duplicate UTRs, stores proof, moves payment to
   `REVIEW_REQUIRED` / registration to `UNDER_REVIEW` (a *claim*, not proof).
5. Admin reviews UTR/screenshot in Payments → VERIFY (`CONFIRMED`) or
   REJECT. Receipt (`/success`) polls status until then.

## 11. QR functionality

- Check-in QR per team via `/api/team/qr` (encodes the public verify URL);
  shown on the team dashboard for event-day scanning.
- Payment QR is separate: the admin-uploaded UPI image served by
  `/api/payment-qr` (public by design — payers must scan it).
- `/verify?id=REGID` resolves any check-in QR to team + payment status.

## 12. Excel synchronization

- Triggers: registration create, proof submit, admin verify/reject/review/
  duplicate/block/note (all call `triggerSync`; registration success never
  waits for sync).
- Dedup: one coalesced job per registration; workbook upserts by
  registration ID (`Registrations`), `REGID#idx` (members), payment id.
- Persistence: the `.xlsx` file on disk *is* the sheet (atomic writes);
  failed jobs retry (`EXCEL_SYNC_MAX_RETRIES`), stuck jobs recover on boot;
  `/admin/data-sync` shows health; `/admin/export` rebuilds + downloads.
- Not "real-time push" — near-immediate background sync (usually < seconds).

## 13. Testing

No automated suites ship with the repo. Verified process used for changes:

```bash
npx tsc --noEmit     # typecheck (must pass)
npm run build        # production build, 31 routes (must pass)
npm run lint         # Next.js lint (available)
node scripts/shots.cjs [baseUrl] [outDir]   # dev-only screenshots (needs Edge + running server)
```

Plus manual API end-to-end (register → proof → admin verify → status),
workbook row checks, and duplicate/validation negative cases.

## 14. Security

Implemented: admin JWT (`vx_admin`, 12h) + middleware on `/admin/*`;
team scrypt password hashes (never raw) + JWT (`vx_team`) + password policy
(8+, upper/lower/number); zod server validation everywhere; per-route
in-memory rate limits on create/proof/login; QR/screenshot uploads restricted
to PNG/JPEG with magic-byte + size checks and safe-replacement writes;
private uploads served admin-only; no secrets in client bundles; `.env*`,
DB, workbook excluded from git. Known caveat: past git history contains an
uploaded `.env.local`/DB snapshot — rotate `*_JWT_SECRET` and Razorpay test
keys if they were ever real.

## 15. CI/CD pipeline

None. No GitHub Actions, no Docker, no deploy hooks. Verification is manual
(`tsc` + `next build` + API tests above) before push.

## 16. Production deployment

```bash
npm install && npm run build && npm start   # serves :30001
```

- Set `ADMIN_*`, `TEAM_JWT_SECRET`, SMTP/OCRSPACE as needed in production env.
- Mount a **persistent volume at `./data`** (SQLite, uploads incl. active
  UPI QR + proofs, workbook all live there; ephemeral disks lose them).
- No gateway/webhook configuration needed. Serve over HTTPS; QR image loads
  same-origin, so no mixed-content issues.

## 17. Contributing

Keep changes small and additive: validate → save primary data → sync side
effects (never block responses on Excel/email). Test with `tsc` + `build` +
a manual register→pay→verify pass, update this README if behavior changes,
commit clearly, push without force.

## 18. License

No license file ships with this repository.
