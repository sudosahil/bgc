const { DatabaseSync } = require('node:sqlite')
const bcrypt = require('bcryptjs')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'bgc.sqlite')

let db

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH)
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA foreign_keys = ON")
    initSchema()
    seedData()
  }
  return db
}

// Transaction helper (node:sqlite has no db.transaction() helper)
function transaction(fn) {
  const d = getDb()
  d.exec('BEGIN')
  try {
    const result = fn()
    d.exec('COMMIT')
    return result
  } catch (e) {
    try { d.exec('ROLLBACK') } catch {}
    throw e
  }
}

// node:sqlite returns BigInt for lastInsertRowid — always normalise to Number
function lastId(result) {
  return Number(result.lastInsertRowid)
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      email           TEXT    UNIQUE NOT NULL,
      phone           TEXT    UNIQUE NOT NULL,
      password_hash   TEXT    NOT NULL,
      wallet_balance  REAL    DEFAULT 0,
      points          INTEGER DEFAULT 0,
      role            TEXT    DEFAULT 'user' CHECK(role IN ('user','admin')),
      is_active       INTEGER DEFAULT 1,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL CHECK(type IN ('pc','playstation','pool')),
      name        TEXT NOT NULL UNIQUE,
      hourly_rate REAL NOT NULL,
      description TEXT,
      is_active   INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id),
      station_id      INTEGER NOT NULL REFERENCES stations(id),
      start_time      TEXT    NOT NULL,
      end_time        TEXT    NOT NULL,
      duration_hours  REAL    NOT NULL,
      total_amount    REAL    NOT NULL,
      deposit_amount  REAL    NOT NULL,
      final_amount    REAL    NOT NULL,
      deposit_paid    INTEGER DEFAULT 0,
      final_paid      INTEGER DEFAULT 0,
      payment_method  TEXT    DEFAULT 'wallet' CHECK(payment_method IN ('wallet','cash')),
      status          TEXT    DEFAULT 'confirmed'
                      CHECK(status IN ('confirmed','pending_final','pending_cash','cancelled','completed')),
      notes           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL REFERENCES users(id),
      booking_id          INTEGER REFERENCES bookings(id),
      amount              REAL    NOT NULL,
      type                TEXT    NOT NULL
                          CHECK(type IN ('deposit','final_payment','refund','points_redeem','topup','walkin_credit')),
      description         TEXT,
      razorpay_payment_id TEXT,
      razorpay_order_id   TEXT,
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS walkins (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id      INTEGER NOT NULL REFERENCES stations(id),
      customer_name   TEXT    NOT NULL,
      customer_phone  TEXT,
      start_time      TEXT    NOT NULL,
      duration_hours  REAL    NOT NULL,
      total_amount    REAL    NOT NULL,
      amount_paid     REAL    NOT NULL,
      notes           TEXT,
      created_by      INTEGER NOT NULL REFERENCES users(id),
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS razorpay_orders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      order_id    TEXT    NOT NULL UNIQUE,
      amount      REAL    NOT NULL,
      status      TEXT    DEFAULT 'created' CHECK(status IN ('created','paid','failed')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_station_time ON bookings(station_id, start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

    CREATE TABLE IF NOT EXISTS discounts (
      id              TEXT    PRIMARY KEY,
      code            TEXT    NOT NULL UNIQUE,
      label           TEXT    NOT NULL,
      description     TEXT    NOT NULL,
      type            TEXT    NOT NULL CHECK(type IN ('PERCENTAGE','FLAT')),
      value           REAL    NOT NULL,
      min_booking     REAL    NOT NULL,
      applies_to      TEXT    NOT NULL DEFAULT 'ALL' CHECK(applies_to IN ('ALL','PC','PS5','POOL')),
      max_uses        INTEGER,
      uses_so_far     INTEGER DEFAULT 0,
      per_user_limit  INTEGER DEFAULT 1,
      valid_from      DATETIME NOT NULL,
      valid_until     DATETIME,
      is_active       INTEGER DEFAULT 1,
      created_by      INTEGER NOT NULL REFERENCES users(id),
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discount_uses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      discount_id TEXT    NOT NULL REFERENCES discounts(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      booking_id  INTEGER NOT NULL REFERENCES bookings(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_discount_uses_discount ON discount_uses(discount_id);
    CREATE INDEX IF NOT EXISTS idx_discount_uses_user ON discount_uses(user_id, discount_id);
  `)

  // Safely add discount columns to bookings (ignore if already exist)
  ;['discount_id TEXT', 'discount_amount REAL DEFAULT 0', 'discount_code TEXT'].forEach(col => {
    try { db.exec(`ALTER TABLE bookings ADD COLUMN ${col}`) } catch (_) {}
  })
}

function seedData() {
  const existingStations = db.prepare('SELECT COUNT(*) as cnt FROM stations').get()
  if (existingStations.cnt > 0) return

  const insertStation = db.prepare(
    'INSERT INTO stations (type, name, hourly_rate, description) VALUES (?, ?, ?, ?)'
  )
  for (let i = 1; i <= 20; i++) {
    insertStation.run('pc', `PC-${String(i).padStart(2, '0')}`, 50, 'High-performance gaming rig with RTX GPU, 144Hz display')
  }
  for (let i = 1; i <= 3; i++) {
    insertStation.run('playstation', `PS-${String(i).padStart(2, '0')}`, 150, 'PlayStation 5 with 4K display, DualSense controllers')
  }
  insertStation.run('pool', 'Pool-Table-01', 450, 'Professional 7-foot billiards table, equipment included')

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = 'admin@bgc.com'").get()
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (name, email, phone, password_hash, wallet_balance, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run('BGC Admin', 'admin@bgc.com', '9999999999', hash, 0, 'admin')
  }

  const existingPlayer = db.prepare("SELECT id FROM users WHERE email = 'player@bgc.com'").get()
  if (!existingPlayer) {
    const hash = bcrypt.hashSync('player123', 10)
    db.prepare('INSERT INTO users (name, email, phone, password_hash, wallet_balance, points) VALUES (?, ?, ?, ?, ?, ?)')
      .run('Demo Player', 'player@bgc.com', '9876543210', hash, 500, 250)
  }
}

function _resetDb() { db = null }

module.exports = { getDb, transaction, lastId, _resetDb }
