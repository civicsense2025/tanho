// Append-only security/admin audit log (SOC 2 CC7.2 / ISO A.8.15 / HIPAA
// 164.312(b)). Written on admin login, settings changes, and content publish/
// delete. NEVER stores secrets (no passwords, tokens, or secret setting values) --
// only ids, actions, outcomes, and request context. metadata holds a small JSON
// object of non-sensitive fields.
export const sql = `
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT NOT NULL PRIMARY KEY,
  ts          TEXT NOT NULL DEFAULT (datetime('now')),
  actor       TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  ip          TEXT,
  user_agent  TEXT,
  outcome     TEXT NOT NULL,
  metadata    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log(ts);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
`;
