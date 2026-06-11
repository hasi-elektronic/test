-- Sachbearbeiter (aus Sachbearbeiter_Drueckteile.xlsx)
-- + Kalkulation bekommt ein Sachbearbeiter-Feld

CREATE TABLE IF NOT EXISTS sachbearbeiter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kuerzel TEXT NOT NULL DEFAULT ''
);

ALTER TABLE calculations ADD COLUMN sachbearbeiter TEXT NOT NULL DEFAULT '';

INSERT INTO sachbearbeiter (name, kuerzel) VALUES
  ('Bauz', 'BAU'),
  ('Braun', 'BRA'),
  ('Can-Aktürk', 'CAN'),
  ('Fatih', 'FAT'),
  ('Gerschwitz', 'GER'),
  ('Hamdi', 'HAM'),
  ('Jasmin', 'JAS'),
  ('Marcel', 'MAR'),
  ('Ralf', 'RAL'),
  ('Ralph', 'RPH'),
  ('Uwe', 'UWE'),
  ('Uwe-Hamdi', 'UHA'),
  ('Wöhr', 'WOE');
