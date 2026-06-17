-- CAD-Tool-Import: Shared-Secret-Token (Wert separat gesetzt/zu setzen)
-- Die DXF-Dateien liegen im R2-Bucket unter cad-dxf/{id}.dxf, data.dxfKey verweist darauf.

INSERT OR IGNORE INTO settings (key, value) VALUES ('cad_import_token', '');
