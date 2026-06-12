-- Materialpreise: Aktualisierungsdatum für Veraltet-Warnung im Editor

ALTER TABLE materials ADD COLUMN price_updated_at TEXT;
UPDATE materials SET price_updated_at = datetime('now') WHERE price_per_kg > 0;
