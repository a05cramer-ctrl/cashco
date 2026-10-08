// The dairy's tables. Created on first use; additive changes only (this is the live ledger).
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS rounds (
  round_id INTEGER PRIMARY KEY,
  samples INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  claim_sig TEXT,
  claim_sent_at INTEGER,
  claimed_lamports INTEGER NOT NULL DEFAULT 0,
  pot_lamports INTEGER NOT NULL DEFAULT 0,
  paid_lamports INTEGER NOT NULL DEFAULT 0,
  holders_counted INTEGER NOT NULL DEFAULT 0,
  holders_paid INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  closed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds (status, round_id);

CREATE TABLE IF NOT EXISTS payslips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  wallet TEXT NOT NULL,
  avg_tokens REAL NOT NULL DEFAULT 0,
  share_bps REAL NOT NULL DEFAULT 0,
  amount_lamports INTEGER NOT NULL,
  status TEXT NOT NULL,
  tx_sig TEXT,
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payslips_round ON payslips (round_id);
CREATE INDEX IF NOT EXISTS idx_payslips_wallet ON payslips (wallet, id);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips (status, sent_at);
CREATE INDEX IF NOT EXISTS idx_payslips_tx ON payslips (tx_sig);

CREATE TABLE IF NOT EXISTS holders (
  wallet TEXT PRIMARY KEY,
  total_paid_lamports INTEGER NOT NULL DEFAULT 0,
  rounds_paid INTEGER NOT NULL DEFAULT 0,
  last_paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);
`;
