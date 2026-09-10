// Minimal durable store on Node's built-in SQLite (no native deps).
// DB file: data/visionx.db
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Overridable so hosts with a persistent disk can point data at the mount
// (e.g. DATA_DIR=/opt/render/project/src/data on Render). Defaults to
// ./data next to the running server, preserving local/Docker behavior.
// NOTE: under `output: 'standalone'` the server chdir's into
// `.next/standalone`, so a relative default resolves there — set DATA_DIR
// explicitly on hosts where deploys wipe the build directory.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'visionx.db');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.writeFileSync(path.join(UPLOAD_DIR, '.gitkeep'), '');

let _db: DatabaseSync | null = null;
export function db(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL;');
    migrate(_db);
    // Startup recovery: retry Excel syncs orphaned by a restart (best effort, never throws).
    setImmediate(() => {
      import('./excel/sync-engine').then((m) => m.recoverPendingSyncs().catch(() => {})).catch(() => {});
    });
  }
  return _db;
}

export function migrate(d: DatabaseSync) {
  d.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id=1),
    hackathon_name TEXT DEFAULT 'VISION X 2026 HACKATHON',
    description TEXT DEFAULT 'Collaborate in teams to build innovative solutions.',
    registration_fee INTEGER DEFAULT 399,
    upi_id TEXT DEFAULT 'visionx@upi',
    min_team_size INTEGER DEFAULT 1,
    max_team_size INTEGER DEFAULT 4,
    reg_open INTEGER DEFAULT 1,
    reg_start TEXT DEFAULT '',
    reg_end TEXT DEFAULT '',
    venue TEXT DEFAULT 'Annamayya Auditorium',
    location_name TEXT DEFAULT 'Annamacharya Institute of Technology And Sciences',
    location_address TEXT DEFAULT 'Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520',
    map_embed_url TEXT DEFAULT 'https://www.google.com/maps?q=Annamacharya%20Institute%20of%20Technology%20and%20Sciences%20Venkatapuram%20Renigunta%20Tirupati%20Andhra%20Pradesh%20517520&output=embed',
    map_link TEXT DEFAULT 'https://www.google.com/maps/search/?api=1&query=Annamacharya+Institute+of+Technology+and+Sciences+Venkatapuram+Renigunta+Tirupati+Andhra+Pradesh+517520',
    contact_email TEXT DEFAULT 'hello@visionx.hack',
    contact_phone TEXT DEFAULT '+91-90000-00000',
    rules TEXT DEFAULT '1. Teams of 1-4.\\n2. Original work only.\\n3. Bring your own laptops.\\n4. Judges decision is final.',
    eligibility TEXT DEFAULT 'Open to all college / university students with a valid ID card.',
    reg_prefix TEXT DEFAULT 'VX2026',
    schedule_json TEXT DEFAULT '[]',
    qr_image_path TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO settings (id) VALUES (1);
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    team_size INTEGER NOT NULL,
    leader_name TEXT NOT NULL,
    leader_email TEXT NOT NULL,
    leader_phone TEXT NOT NULL,
    college TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    registration_status TEXT DEFAULT 'SUBMITTED',
    flags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reg_team ON registrations(team_name);
  CREATE INDEX IF NOT EXISTS idx_reg_email ON registrations(leader_email);
  CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at);

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    college TEXT DEFAULT '',
    department TEXT DEFAULT '',
    year TEXT DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_mem_reg ON team_members(registration_id);
  CREATE INDEX IF NOT EXISTS idx_mem_roll ON team_members(roll_number);

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT UNIQUE NOT NULL,
    transaction_id TEXT DEFAULT '',
    manual_txn TEXT DEFAULT '',
    ocr_txn TEXT DEFAULT '',
    amount INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'UPI',
    screenshot_path TEXT DEFAULT '',
    payment_status TEXT DEFAULT 'PENDING',
    ocr_confidence REAL DEFAULT 0,
    ocr_raw TEXT DEFAULT '',
    verified_by TEXT DEFAULT '',
    verified_at TEXT DEFAULT '',
    admin_notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_pay_txn ON payments(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_pay_status ON payments(payment_status);

  CREATE TABLE IF NOT EXISTS pending_uploads (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    mime TEXT DEFAULT '',
    size INTEGER DEFAULT 0,
    ocr_txn TEXT DEFAULT '',
    ocr_amount TEXT DEFAULT '',
    ocr_status TEXT DEFAULT '',
    ocr_confidence REAL DEFAULT 0,
    ocr_raw TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    admin TEXT DEFAULT '',
    registration_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS counters (
    id INTEGER PRIMARY KEY CHECK (id=1),
    last_seq INTEGER DEFAULT 0
  );
  INSERT OR IGNORE INTO counters (id, last_seq) VALUES (1, 0);
  `);
  try { d.exec(`UPDATE settings SET hackathon_name='VISION X 2026 HACKATHON' WHERE id=1 AND hackathon_name='VISION X HACKATHON'`); } catch {}
  migrateV2(d);
}

// V2: payment provider architecture, fraud, excel sync — all additive, idempotent.
function migrateV2(d: DatabaseSync) {
  const cols = (t: string): Set<string> => {
    try {
      const rows: any[] = d.prepare(`PRAGMA table_info(${t})`).all();
      return new Set(rows.map((r) => String(r.name)));
    } catch { return new Set(); }
  };
  const addCol = (table: string, col: string, ddl: string) => {
    try { if (!cols(table).has(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`); } catch {}
  };
  // --- payments extensions ---
  for (const [c, ddl] of [
    ['provider', `TEXT DEFAULT 'razorpay'`],
    ['provider_order_id', `TEXT DEFAULT ''`],
    ['provider_payment_id', `TEXT DEFAULT ''`],
    ['provider_session_id', `TEXT DEFAULT ''`],
    ['payment_reference', `TEXT DEFAULT ''`],
    ['currency', `TEXT DEFAULT 'INR'`],
    ['gateway_status', `TEXT DEFAULT ''`],
    ['verification_status', `TEXT DEFAULT 'UNVERIFIED'`],
    ['webhook_verified', `INTEGER DEFAULT 0`],
    ['webhook_event_id', `TEXT DEFAULT ''`],
    ['fraud_risk_score', `INTEGER DEFAULT 0`],
    ['fraud_risk_level', `TEXT DEFAULT 'LOW'`],
    ['fraud_status', `TEXT DEFAULT 'CLEAR'`],
    ['risk_reasons', `TEXT DEFAULT '[]'`],
    ['screenshot_hash', `TEXT DEFAULT ''`],
    ['screenshot_avg_hash', `TEXT DEFAULT ''`],
    ['updated_at', `TEXT DEFAULT (datetime('now'))`],
  ] as [string, string][]) addCol('payments', c, ddl);
  // --- pending_uploads extensions ---
  for (const [c, ddl] of [
    ['sha256', `TEXT DEFAULT ''`],
    ['avg_hash', `TEXT DEFAULT ''`],
  ] as [string, string][]) addCol('pending_uploads', c, ddl);
  // --- registrations: confirmed timestamp ---
  addCol('registrations', 'confirmed_at', `TEXT DEFAULT ''`);

  d.exec(`
  CREATE TABLE IF NOT EXISTS fraud_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT DEFAULT '',
    payment_id INTEGER DEFAULT NULL,
    rule_id TEXT NOT NULL,
    severity TEXT DEFAULT 'low',
    points INTEGER DEFAULT 0,
    evidence TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    identifier TEXT DEFAULT '',
    event_type TEXT DEFAULT 'RISK_SIGNAL',
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_fraud_reg ON fraud_events(registration_id);
  CREATE INDEX IF NOT EXISTS idx_fraud_pay ON fraud_events(payment_id);
  CREATE INDEX IF NOT EXISTS idx_fraud_rule ON fraud_events(rule_id);

  CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    registration_id TEXT DEFAULT '',
    payload TEXT DEFAULT '',
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, event_id)
  );

  CREATE TABLE IF NOT EXISTS excel_sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT NOT NULL,
    entity_type TEXT DEFAULT 'REGISTRATION',
    entity_id TEXT DEFAULT '',
    sync_status TEXT DEFAULT 'PENDING',
    attempt_count INTEGER DEFAULT 0,
    last_error TEXT DEFAULT '',
    last_synced_at TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sync_status ON excel_sync_jobs(sync_status);
  CREATE INDEX IF NOT EXISTS idx_sync_reg ON excel_sync_jobs(registration_id);
  `);
  try { d.exec(`CREATE INDEX IF NOT EXISTS idx_pay_provider_order ON payments(provider_order_id)`); } catch {}
  try { d.exec(`CREATE INDEX IF NOT EXISTS idx_pay_reference ON payments(payment_reference)`); } catch {}
  try { d.exec(`CREATE INDEX IF NOT EXISTS idx_pay_screenshot ON payments(screenshot_hash)`); } catch {}
  // --- settings: admin payment QR image (image file only, shown to participants) ---
  addCol('settings', 'qr_image_path', `TEXT DEFAULT ''`);
  migrateV3(d);
}

// V3: student team login — all additive, idempotent. Passwords only ever exist
// as scrypt hashes; the raw password is never stored anywhere.
function migrateV3(d: DatabaseSync) {
  const cols = (t: string): Set<string> => {
    try {
      const rows: any[] = d.prepare(`PRAGMA table_info(${t})`).all();
      return new Set(rows.map((r) => String(r.name)));
    } catch { return new Set(); }
  };
  const addCol = (table: string, col: string, ddl: string) => {
    try { if (!cols(table).has(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`); } catch {}
  };
  for (const [c, ddl] of [
    ['team_password_hash', `TEXT DEFAULT ''`],
    ['password_created', `INTEGER DEFAULT 0`],
    ['password_created_at', `TEXT DEFAULT ''`],
    ['password_updated_at', `TEXT DEFAULT ''`],
    ['last_login_at', `TEXT DEFAULT ''`],
  ] as [string, string][]) addCol('registrations', c, ddl);
  migrateV4(d);
}

// V4: venue + college location (maps) — additive, idempotent. Also fixes the
// venue spelling to "Annamayya Auditorium" and seeds the canonical
// "Annamacharya Institute of Technology And Sciences" Tirupati address.
function migrateV4(d: DatabaseSync) {
  const cols = (t: string): Set<string> => {
    try {
      const rows: any[] = d.prepare(`PRAGMA table_info(${t})`).all();
      return new Set(rows.map((r) => String(r.name)));
    } catch { return new Set(); }
  };
  const addCol = (table: string, col: string, ddl: string) => {
    try { if (!cols(table).has(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`); } catch {}
  };
  addCol('settings', 'location_name', `TEXT DEFAULT 'Annamacharya Institute of Technology And Sciences'`);
  addCol('settings', 'location_address', `TEXT DEFAULT 'Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520'`);
  addCol('settings', 'map_embed_url', `TEXT DEFAULT 'https://www.google.com/maps?q=Annamacharya%20Institute%20of%20Technology%20and%20Sciences%20Venkatapuram%20Renigunta%20Tirupati%20Andhra%20Pradesh%20517520&output=embed'`);
  addCol('settings', 'map_link', `TEXT DEFAULT 'https://www.google.com/maps/search/?api=1&query=Annamacharya+Institute+of+Technology+and+Sciences+Venkatapuram+Renigunta+Tirupati+Andhra+Pradesh+517520'`);
  try {
    d.exec(`UPDATE settings SET venue='Annamayya Auditorium' WHERE id=1 AND (venue IS NULL OR venue='' OR venue='Main Seminar Hall' OR venue='Main Seminar Hall, Campus' OR venue='Annamaya Auditorium' OR venue='annamaya auditorium')`);
  } catch {}
  try {
    d.exec(`UPDATE settings SET location_name='Annamacharya Institute of Technology And Sciences' WHERE id=1 AND (location_name IS NULL OR location_name='')`);
  } catch {}
  try {
    d.exec(`UPDATE settings SET location_address='Annamacharya Institute of Technology & Sciences, Venkatapuram Village, Renigunta Mandal, Tirupati, Andhra Pradesh 517520' WHERE id=1 AND (location_address IS NULL OR location_address='' OR location_address LIKE '%Rajampet%' OR location_address LIKE '%Kadapa%' OR location_address LIKE '%Boyanapalli%' OR location_address LIKE '%Thallapaka%')`);
  } catch {}
  try {
    d.exec(`UPDATE settings SET map_embed_url='https://www.google.com/maps?q=Annamacharya%20Institute%20of%20Technology%20and%20Sciences%20Venkatapuram%20Renigunta%20Tirupati%20Andhra%20Pradesh%20517520&output=embed' WHERE id=1 AND (map_embed_url IS NULL OR map_embed_url='' OR map_embed_url LIKE '%Rajampet%' OR map_embed_url LIKE '%Kadapa%' OR map_embed_url LIKE '%516126%')`);
  } catch {}
  try {
    d.exec(`UPDATE settings SET map_link='https://www.google.com/maps/search/?api=1&query=Annamacharya+Institute+of+Technology+and+Sciences+Venkatapuram+Renigunta+Tirupati+Andhra+Pradesh+517520' WHERE id=1 AND (map_link IS NULL OR map_link='' OR map_link LIKE '%Rajampet%' OR map_link LIKE '%Kadapa%' OR map_link LIKE '%516126%')`);
  } catch {}
}

export function getSettings() {
  const row = db().prepare('SELECT * FROM settings WHERE id=1').get() as any;
  try { row.schedule = JSON.parse(row.schedule_json || '[]'); } catch { row.schedule = []; }
  return row;
}

export function audit(action: string, admin = '', registration_id = '', details = '') {
  db().prepare('INSERT INTO audit_log (action, admin, registration_id, details) VALUES (?,?,?,?)')
    .run(action, admin, registration_id, details);
}

export function nextRegistrationId(prefix: string) {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    d.prepare('UPDATE counters SET last_seq = last_seq + 1 WHERE id=1').run();
    const seq = d.prepare('SELECT last_seq FROM counters WHERE id=1').get() as any;
    d.exec('COMMIT');
    const n = String(seq.last_seq).padStart(4, '0');
    return `${prefix}-${n}`;
  } catch (e) {
    try { d.exec('ROLLBACK'); } catch {}
    throw e;
  }
}

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
