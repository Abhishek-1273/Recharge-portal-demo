-- ============================================================
-- Recharge Partner Portal: Supabase Cloud Database Schema
-- 3-Tier Model: Super Distributor, Distributor, Retailer
-- ============================================================

-- 1. Accounts Table (Stores user roles and live balances in Paise)
CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  parent_user_id TEXT,
  balance_paise BIGINT NOT NULL DEFAULT 0,
  hold_paise BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ledger Entries Table (Strictly INSERT-ONLY Financial Audit Trail)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  entry_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES accounts(user_id),
  amount_paise BIGINT NOT NULL, -- positive = credit, negative = debit
  type TEXT NOT NULL,           -- 'TOPUP', 'RECHARGE_HOLD', 'RECHARGE_DEBIT', 'REFUND', 'COMMISSION', 'PLATFORM_FEE'
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions Table (Live Recharge Tracking)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES accounts(user_id),
  service_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  operator TEXT NOT NULL,
  amount_paise BIGINT NOT NULL,
  provider_commission_paise BIGINT DEFAULT 0,
  platform_fee_paise BIGINT DEFAULT 0,
  status TEXT NOT NULL,         -- 'PENDING', 'SUCCESS', 'FAILED'
  provider_ref TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 4. Commission Rules Table (3-Tier Dynamic Matrix)
CREATE TABLE IF NOT EXISTS commission_rules (
  id BIGSERIAL PRIMARY KEY,
  service_type TEXT NOT NULL UNIQUE,
  provider_commission_bps INT NOT NULL, -- 300 bps = 3.0%
  platform_fee_bps INT NOT NULL,        -- 25 bps = 0.25% (App fee)
  retailer_share_bps INT NOT NULL,      -- 150 bps = 1.50%
  distributor_share_bps INT NOT NULL,   -- 100 bps = 1.00%
  super_share_bps INT NOT NULL          -- 50 bps = 0.50%
);

-- 5. Idempotency Table (Double-submit protection)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial 3 Partners into Supabase:
-- Retailer starts with ₹1,000 demo balance (100,000 paise)
INSERT INTO accounts (user_id, name, role, parent_user_id, balance_paise, hold_paise)
VALUES 
  ('super', 'Super Distributor', 'SUPER_DISTRIBUTOR', null, 0, 0),
  ('distributor', 'Distributor', 'DISTRIBUTOR', 'super', 0, 0),
  ('retailer', 'Retailer (Dukaan)', 'RETAILER', 'distributor', 100000, 0)
ON CONFLICT (user_id) DO NOTHING;

-- Initial Ledger Entry for Retailer ₹1,000 Seed
INSERT INTO ledger_entries (entry_id, user_id, amount_paise, type, reference_id, notes)
VALUES 
  ('init-seed-retailer-supabase', 'retailer', 100000, 'TOPUP', 'SEED_INIT', 'Initial demo seed balance (₹1,000.00)')
ON CONFLICT (entry_id) DO NOTHING;

-- Seed Commission Rules for Mobile Recharge
INSERT INTO commission_rules (service_type, provider_commission_bps, platform_fee_bps, retailer_share_bps, distributor_share_bps, super_share_bps)
VALUES ('MOBILE', 300, 25, 150, 100, 50)
ON CONFLICT (service_type) DO NOTHING;

-- Enable Realtime so changes update live on dashboard!
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

