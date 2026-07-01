export const sql = `
CREATE TABLE IF NOT EXISTS orders (
  id                        TEXT PRIMARY KEY,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id        TEXT,
  stripe_payment_intent_id  TEXT,
  customer_email            TEXT,
  kind                      TEXT NOT NULL DEFAULT 'one_time',
  status                    TEXT NOT NULL DEFAULT 'pending',
  post_id                   TEXT,
  price_id                  TEXT,
  amount_total              INTEGER,
  currency                  TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     TEXT PRIMARY KEY,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id     TEXT NOT NULL,
  customer_email         TEXT,
  status                 TEXT NOT NULL,
  current_period_end     TEXT,
  price_id               TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(customer_email);
`;
