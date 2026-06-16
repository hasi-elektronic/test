-- Angebotskorb (Einkaufswagen) pro Benutzer

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  calc_id INTEGER,
  bezeichnung TEXT NOT NULL DEFAULT '',
  spec TEXT NOT NULL DEFAULT '',
  menge REAL NOT NULL DEFAULT 1,
  einzel REAL NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL DEFAULT '',
  drawing_no TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
