const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'recharge_portal.db');
const db = new sqlite3.Database(DB_PATH);

// Helper wrapper to run SQL as Promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize Tables and default data for 3-Tier Architecture
async function initDatabase() {
  await run(`PRAGMA journal_mode = WAL;`);
  await run(`PRAGMA synchronous = NORMAL;`);
  await run(`PRAGMA foreign_keys = ON;`);

  // 1. Accounts Table (Stores cached balance in Paise)
  await run(`
    CREATE TABLE IF NOT EXISTS accounts (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      parent_user_id TEXT,
      balance_paise INTEGER NOT NULL DEFAULT 0,
      hold_paise INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Ledger Entries Table (Strictly INSERT ONLY)
  await run(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES accounts(user_id)
    )
  `);

  // 3. Transactions Table
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      service_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      operator TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      provider_commission_paise INTEGER DEFAULT 0,
      platform_fee_paise INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      provider_ref TEXT,
      idempotency_key TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `);

  // 4. Commission Rules Table (Drop and re-create for 3-tier clean schema)
  await run(`DROP TABLE IF EXISTS commission_rules;`);
  await run(`
    CREATE TABLE commission_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_type TEXT NOT NULL UNIQUE,
      provider_commission_bps INTEGER NOT NULL, -- 300 bps = 3.0%
      platform_fee_bps INTEGER NOT NULL,        -- 25 bps = 0.25% (App fee)
      retailer_share_bps INTEGER NOT NULL,      -- 150 bps = 1.50%
      distributor_share_bps INTEGER NOT NULL,   -- 100 bps = 1.00%
      super_share_bps INTEGER NOT NULL          -- 50 bps = 0.50%
    )
  `);

  // 5. Idempotency Keys Table
  await run(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure exactly the 3 Accounts requested:
  // 1. super (Super Distributor)
  // 2. distributor (Distributor)
  // 3. retailer (Retailer)
  await run(`INSERT OR IGNORE INTO accounts (user_id, name, role, parent_user_id, balance_paise, hold_paise) VALUES ('super', 'Super Distributor', 'SUPER_DISTRIBUTOR', null, 0, 0)`);
  await run(`INSERT OR IGNORE INTO accounts (user_id, name, role, parent_user_id, balance_paise, hold_paise) VALUES ('distributor', 'Distributor', 'DISTRIBUTOR', 'super', 0, 0)`);
  await run(`INSERT OR IGNORE INTO accounts (user_id, name, role, parent_user_id, balance_paise, hold_paise) VALUES ('retailer', 'Retailer (Dukaan)', 'RETAILER', 'distributor', 100000, 0)`);

  // Seed 3-Tier Commission Rules
  await run(`
    INSERT INTO commission_rules 
    (service_type, provider_commission_bps, platform_fee_bps, retailer_share_bps, distributor_share_bps, super_share_bps)
    VALUES ('MOBILE', 300, 25, 150, 100, 50)
  `);

  console.log('✅ Exactly 3 Panels (Super Distributor, Distributor, Retailer) initialized.');
}

module.exports = {
  db,
  initDatabase,
  run,
  get,
  all,
};
