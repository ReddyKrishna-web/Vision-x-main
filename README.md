# VISION X 2026 HACKATHON — Setup

## 1. Install
```
npm install
cp .env.example .env.local   # fill ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_JWT_SECRET
```

## 2. Run
```
npm run dev   # http://localhost:30001
```

## 3. Admin
- Login: `/admin/login`
- Dashboard: `/admin/dashboard`
- Registrations: `/admin/registrations`
- Export: `/admin/export` (ALL / VERIFIED / PENDING / REJECTED / DUPLICATE .xlsx)
- Settings: `/admin/settings` (fee, UPI ID, team size, open/close, schedule JSON, prefix)

## Notes
- DB: built-in Node SQLite at `data/visionx.db` (no extra service needed; swap to Postgres/Supabase later via `src/lib/db.ts`).
- Uploads stored privately in `data/uploads/`, served only to admin via `/api/uploads/[id]`.
- OCR: built-in tesseract.js; set `OCRSPACE_API_KEY` in `.env.local` for higher screenshot accuracy (optional).
- Email: set SMTP_* to enable confirmation mails; fails gracefully if empty.
- Secrets only in `.env.local`, never in frontend.
