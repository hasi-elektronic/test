-- Sickinger Kalkulation – Schema & Stammdaten
-- Quelle: Excel-Kalkulationen Laufrad V9.0, Drückteile V4.0, Baugruppen V8.0, Schallkabinen V5.0

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  special_terms TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price_per_kg REAL NOT NULL DEFAULT 0,
  density REAL NOT NULL DEFAULT 7.85,
  color_group TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

-- Arbeitsgang-Vorlagen je Kalkulationstyp
CREATE TABLE IF NOT EXISTS step_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calc_type TEXT NOT NULL,
  pos INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0,
  setup_min REAL NOT NULL DEFAULT 0
);

-- Material-Vorlagen für Schallkabinen (Zuschlagskalkulation)
CREATE TABLE IF NOT EXISTS material_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pos INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  unit_price REAL NOT NULL DEFAULT 0
);

-- Verpackung & Fahrzeuge (Versandkostenübersicht V7.0)
CREATE TABLE IF NOT EXISTS shipping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  dimensions TEXT NOT NULL DEFAULT '',
  shipping_price REAL NOT NULL DEFAULT 0,
  packaging_price REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calc_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  parent_id INTEGER,
  status TEXT NOT NULL DEFAULT 'entwurf',
  customer_id INTEGER,
  customer_name TEXT NOT NULL DEFAULT '',
  inquiry_no TEXT NOT NULL DEFAULT '',
  drawing_no TEXT NOT NULL DEFAULT '',
  calc_date TEXT NOT NULL DEFAULT (date('now')),
  data TEXT NOT NULL DEFAULT '{}',
  offer_text TEXT NOT NULL DEFAULT '',
  material_sum REAL NOT NULL DEFAULT 0,
  prod_sum REAL NOT NULL DEFAULT 0,
  ext_sum REAL NOT NULL DEFAULT 0,
  ship_sum REAL NOT NULL DEFAULT 0,
  manufacturing_cost REAL NOT NULL DEFAULT 0,
  profit REAL NOT NULL DEFAULT 0,
  sales_total REAL NOT NULL DEFAULT 0,
  sales_unit REAL NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calc_type ON calculations(calc_type);
CREATE INDEX IF NOT EXISTS idx_calc_status ON calculations(status);
CREATE INDEX IF NOT EXISTS idx_calc_parent ON calculations(parent_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ===================== SEED =====================

-- Initialer Admin (Passwort: Sickinger2026! – nach erstem Login ändern!)
INSERT INTO users (email, name, password_hash, salt, role) VALUES
  ('admin@sickinger.de', 'Administrator', 'b403127cc0d1b97f5cbc5c08c180a7e3358952a2cfb9102eee4dcc291e8ceeaf', 'bf11001d61e9ae4038f41e0d91f1863c', 'admin');

-- Materialliste (Preise/Kg bitte in Stammdaten pflegen)
INSERT INTO materials (name, price_per_kg, density, color_group, note, sort) VALUES
  ('1.0330 (DC01)', 0, 7.85, 'Lila', '', 10),
  ('1.0038 (St-37)', 0, 7.85, 'Orange', '', 20),
  ('1.0570 (St-52)', 0, 7.85, 'Orange', '', 30),
  ('1.0976 (S355MC)', 0, 7.85, 'Orange', '', 40),
  ('1.0980 (S420MC)', 0, 7.85, 'Orange', '', 50),
  ('1.8974 (S700MC)', 0, 7.85, 'Orange', '', 60),
  ('1.5415 (16Mo3)', 0, 7.85, 'Orange', '', 70),
  ('1.8928 Naxtra QL', 0, 7.85, 'Grün', 'Achtung Preisunterschiede bei unterschiedlichen Dicken', 80),
  ('1.8988 Naxtra Super QL1', 0, 7.85, 'Grün', 'Achtung Preisunterschiede bei unterschiedlichen Dicken', 90),
  ('1.4301', 0, 7.9, 'Gelb', '', 100),
  ('1.4404', 0, 7.9, 'Gelb', '', 110),
  ('1.4462', 0, 7.9, 'Gelb', '', 120),
  ('1.4541', 0, 7.9, 'Gelb', '', 130),
  ('1.4571', 0, 7.9, 'Gelb', '', 140),
  ('1.4828', 0, 7.9, 'Gelb', '', 150),
  ('1.4835', 0, 7.9, 'Gelb', '', 160),
  ('1.4878', 0, 7.9, 'Gelb', '', 170),
  ('3.3535 (Alu Almg-3)', 0, 2.71, 'Blau', '', 180),
  ('Kupfer', 0, 8.92, 'Rot', '', 190),
  ('Hardox 400', 0, 7.85, 'Braun', '', 200),
  ('Blech verzinkt', 0, 7.85, 'Lila', '', 210),
  ('Beistellung Kunde', 0, 0, '', 'Material vom Kunden beigestellt', 220);

-- Arbeitsgänge Laufrad (V9.0)
INSERT INTO step_templates (calc_type, pos, name, rate, setup_min) VALUES
  ('laufrad', 1, 'Konstruktion / Büro', 60, 60),
  ('laufrad', 2, 'Laser', 75, 5),
  ('laufrad', 3, 'Entgraten / Schleifen', 75, 0),
  ('laufrad', 4, 'Schaufel Rundeln (biegen)', 55, 0),
  ('laufrad', 5, 'Drücken', 200, 30),
  ('laufrad', 6, 'Nabe Drehen', 65, 15),
  ('laufrad', 7, 'Nabe Schweißen', 58, 15),
  ('laufrad', 8, 'Nabe Nuten', 65, 15),
  ('laufrad', 9, 'Laufrad Schweißen', 69, 0),
  ('laufrad', 10, 'Verputzen / Richten', 69, 0),
  ('laufrad', 11, 'Wuchten', 68, 0),
  ('laufrad', 12, 'Waschen', 68, 0),
  ('laufrad', 13, 'Lackieren', 72, 0),
  ('laufrad', 14, 'Handling', 58, 0),
  ('laufrad', 15, 'Verpackung / Versand', 58, 0),
  ('laufrad', 16, 'Sonstiges', 58, 0);

-- Arbeitsgänge Drückteile (V4.0)
INSERT INTO step_templates (calc_type, pos, name, rate, setup_min) VALUES
  ('drueckteile', 1, 'Konstruktion / Büro', 60, 180),
  ('drueckteile', 2, 'Laser', 75, 10),
  ('drueckteile', 3, 'Entgraten / Schleifen', 75, 10),
  ('drueckteile', 4, 'Füsse anschweißen', 58, 15),
  ('drueckteile', 5, 'Versteifung anschweißen', 65, 30),
  ('drueckteile', 6, 'Konus schweißen', 69, 15),
  ('drueckteile', 7, 'Drücken', 200, 15),
  ('drueckteile', 8, 'Abschneiden auf Drückmaschine', 200, 15),
  ('drueckteile', 9, 'Abbrennen auf Abbrenntisch', 65, 15),
  ('drueckteile', 10, 'Verputzen / richten', 68, 15),
  ('drueckteile', 11, 'Lackieren', 68, 15),
  ('drueckteile', 12, 'Verpacken', 58, 10),
  ('drueckteile', 13, 'Transportgestell bauen', 58, 10),
  ('drueckteile', 14, 'Sonstiges', 58, 0);

-- Arbeitsgänge Baugruppen (V8.0)
INSERT INTO step_templates (calc_type, pos, name, rate, setup_min) VALUES
  ('baugruppe', 1, 'Konstruktion / Büro', 60, 60),
  ('baugruppe', 2, 'Laser', 75, 15),
  ('baugruppe', 3, 'Entgraten / Schleifen', 75, 15),
  ('baugruppe', 4, 'Biegen', 70, 15),
  ('baugruppe', 5, 'Rundeln', 55, 15),
  ('baugruppe', 6, 'Mechanik', 65, 15),
  ('baugruppe', 7, 'Heften', 70, 15),
  ('baugruppe', 8, 'Schweißen', 70, 5),
  ('baugruppe', 9, 'Verputzen', 60, 15),
  ('baugruppe', 10, 'Drücken', 200, 0),
  ('baugruppe', 11, 'Lackieren', 72, 15),
  ('baugruppe', 12, 'Handling', 58, 0),
  ('baugruppe', 13, 'Verpackung / Versand', 58, 0),
  ('baugruppe', 14, 'Strahlen (1,2€/Kg)', 0, 0),
  ('baugruppe', 15, 'Sonstiges', 58, 0);

-- Arbeitsgänge Schallkabine (Zuschlagskalkulation, stundenbasiert)
INSERT INTO step_templates (calc_type, pos, name, rate, setup_min) VALUES
  ('schallkabine', 1, 'Büro / Konstruktion', 60, 0),
  ('schallkabine', 2, 'Laserzeit komplett', 75, 0),
  ('schallkabine', 3, 'Entgraten / Schleifen komplett', 75, 0),
  ('schallkabine', 4, 'Biegezeit komplett', 70, 0),
  ('schallkabine', 5, 'Schweißen Rohrgestell', 58, 0),
  ('schallkabine', 6, 'Schweißen Rahmen', 58, 0),
  ('schallkabine', 7, 'Schweißen Kulissenschalldämpfer', 58, 0),
  ('schallkabine', 8, 'Lackierung incl. waschen komplett', 72, 0),
  ('schallkabine', 9, 'Montage Kulissen (pro Stück)', 63, 0),
  ('schallkabine', 10, 'Komplettmontage Zusammenbau', 63, 0),
  ('schallkabine', 11, 'Zerlegen und verpacken', 63, 0),
  ('schallkabine', 12, 'Fotodokumentation', 58, 0),
  ('schallkabine', 13, 'Allgemeines Handling', 58, 0),
  ('schallkabine', 14, 'Sonstiges', 58, 0);

-- Material-Vorlagen Schallkabine
INSERT INTO material_presets (pos, name, comment, supplier, unit_price) VALUES
  (1, 'Blech Verzinkt 1,0', 'Preis pro Kg', 'Divers', 1.2),
  (2, 'Lochblech Verzinkt 1000x2000', 'Tafel', 'Divers', 25),
  (3, 'Lochblech Verzinkt 1250x2500', 'Tafel (5x SW2 + 4x Deckel)', 'Divers', 36),
  (4, 'Lochblech Verzinkt 1500x3000', 'Tafel (4x klein SW1)', 'Divers', 55),
  (5, 'Lochblech Edelstahl RV5-T8 1250x2500', 'Tafel', 'Divers', 190),
  (6, 'Lochblech Edelstahl RV5-T8 1500x3000', 'Tafel', 'Divers', 260),
  (7, 'Verschraubungsmaterial / Nieten', 'VA Nieten, Pauschale', 'Würth', 50),
  (8, 'Schlossriegel', '', 'Baubeschlagshop', 7),
  (9, 'Schnallen (Spannverschluss Stahl)', '', 'Otto Ganter', 2.96),
  (10, 'Scharniere', '', 'Baubeschlagshop', 6),
  (11, 'Schlosserscharnier', '', 'Baubeschlagshop', 8),
  (12, 'Isolierung Wolle ohne Flies 100mm', 'Preis pro m²', 'Sonorock 100', 9.1),
  (13, 'Isolierung Wolle ohne Flies 50mm', 'Preis pro m²', 'Sonorock 100', 4.66),
  (14, 'Isolierung Wolle ohne Flies 60mm', 'Preis pro m²', 'Sonorock 100', 4.97),
  (15, 'Fliessmatte auf Rolle Schwarz', 'Preis pro m²', '', 2.92),
  (16, 'Sandstrahlen / Glasperlenstrahlen', '1,2€/Kg', 'Raiser/Pfeiffer', 1.2),
  (17, 'Beizen', '1,2€/Kg', 'Inox', 1.2);

-- Verpackung (Versandkostenübersicht V7.0, Stand 16.03.2022)
INSERT INTO shipping_items (category, name, dimensions, shipping_price, packaging_price, note, sort) VALUES
  ('verpackung', '1/2 Europalette', '0,8x0,6', 40, 29, '', 10),
  ('verpackung', 'Sonderpalette', '0,8x0,8', 52, 35, '', 20),
  ('verpackung', 'Europalette', '1,2x0,8', 75, 40, '', 30),
  ('verpackung', 'Sonderpalette', '1,0x1,0', 75, 46, '', 40),
  ('verpackung', 'Sonderpalette', '1,2x1,2', 109, 52, '', 50),
  ('verpackung', 'Sonderpalette', '1,3x1,3', 121, 58, '', 60),
  ('verpackung', 'Sonderpalette', '1,4x1,4', 138, 63, '', 70),
  ('verpackung', 'Sonderpalette', '1,5x1,5', 150, 69, '', 80),
  ('verpackung', 'Sonderpalette', '1,6x1,6', 167, 75, '', 90),
  ('verpackung', 'Sonderpalette', '1,7x1,7', 178, 81, '', 100),
  ('verpackung', 'Sonderpalette', '1,8x1,8', 184, 86, '', 110),
  ('verpackung', 'Sonderpalette', '1,9x1,9', 196, 92, '', 120),
  ('verpackung', 'Sonderpalette', '2,0x2,0', 201, 98, '', 130),
  ('verpackung', 'Sonderpalette', '2,2x2,2', 230, 104, '', 140),
  ('verpackung', 'Sonderpalette', '2,4x2,4', 247, 127, '', 150),
  ('verpackung', 'Sonderpalette', '2,5x2,5', 374, 150, 'Überbreite', 160),
  ('verpackung', 'Sonderpalette', '3,0x3,0', 0, 173, 'Überbreite kein Versand', 170),
  ('verpackung', 'Gitterbox', '1,2x0,8x1,0', 86, 109, '', 180),
  ('verpackung', 'Holzkiste / Verschlag', '1,2x0,8x1,0', 86, 86, '', 190),
  ('verpackung', 'Holz-Aufsetzrahmen', '0,8x0,6', 0, 17, '', 200),
  ('verpackung', 'Holz-Aufsetzrahmen', '1,2x0,8', 0, 23, '', 210),
  ('verpackung', 'Versandkarton für Kleinstteile', '', 6, 12, 'Zufuhr mit LKW zum Kunden', 220),
  ('verpackung', 'DHL Paket bis 5 Kg', '', 12, 12, 'Incl. Zufuhr zur Post', 230),
  ('verpackung', 'DHL Paket über 5 Kg', '', 17, 17, 'Incl. Zufuhr zur Post', 240),
  ('verpackung', '2x 4-Kanthölzer 80x80 2,0m', 'Divers', 0, 46, '', 250),
  ('verpackung', '2x 4-Kanthölzer 80x80 2,5m', 'Divers', 0, 52, '', 260),
  ('fahrzeug', 'LKW 40t', 'pro Stunde', 104, 0, '', 300),
  ('fahrzeug', 'LKW 7,5t mit Anhänger', 'pro Stunde', 92, 0, '', 310),
  ('fahrzeug', 'LKW 7,5t ohne Anhänger', 'pro Stunde', 75, 0, '', 320),
  ('fahrzeug', 'Bus', 'pro Stunde', 58, 0, '', 330),
  ('fahrzeug', 'Caddy', 'pro Stunde', 44, 0, '', 340),
  ('fahrzeug', 'Übermaß-Zuschlag Breite (2,4–2,8m)', 'pro Stunde', 92, 0, 'Zuschlag auf LKW 40t', 350),
  ('fahrzeug', 'Übermaß-Zuschlag Höhe (2,7–3,1m)', 'pro Stunde', 69, 0, 'Zuschlag auf LKW 40t', 360);

-- Kunden mit Sondervereinbarungen
INSERT INTO customers (name, special_terms) VALUES
  ('Ziehl Abegg', 'Standardmäßig 7% Aufschlag pro Bestellposition. Sonderfahrten für Abholung / Anlieferungen werden nach Fahrzeugstunden abgerechnet.'),
  ('Siegle + Epple', 'Verrechnung immer nur 30€ für Versand und keine Verpackung.');

-- Lieferanten aus den Kalkulationen
INSERT INTO suppliers (name, notes) VALUES
  ('Würth', 'Verschraubungsmaterial / Nieten'),
  ('Baubeschlagshop', 'Schlossriegel, Scharniere'),
  ('Otto Ganter', 'Spannverschlüsse'),
  ('Raiser/Pfeiffer', 'Sandstrahlen / Glasperlenstrahlen'),
  ('Inox', 'Beizen'),
  ('Lotter', 'Bleche');

-- Einstellungen
INSERT INTO settings (key, value) VALUES
  ('company_name', 'Sickinger GmbH'),
  ('company_address', ''),
  ('company_contact', ''),
  ('offer_footer', 'Die Lieferzeit beträgt aktuell ungefähr 5 - 6 Wochen, nach vollständigem Dateneingang, Klärung aller Fragen und abhängig von der Materialverfügbarkeit.

Für Rückfragen stehe ich Ihnen gerne zur Verfügung.'),
  ('offer_template', 'Schönen guten Tag,

vielen Dank für Ihre Anfrage, diese bieten wir Ihnen gerne wie folgt an.

{titel}

Zum Preis von {preis} pro Stück, zzgl. Verpackung und ab Werk.');
