-- Baugruppen-Gruppierung für Zuschlagskalkulationen (Ventilator)

ALTER TABLE step_templates ADD COLUMN grp TEXT NOT NULL DEFAULT '';
ALTER TABLE material_presets ADD COLUMN grp TEXT NOT NULL DEFAULT '';

UPDATE step_templates SET grp = 'Allgemein' WHERE calc_type='ventilator' AND pos BETWEEN 1 AND 4;
UPDATE step_templates SET grp = 'Gehäuse' WHERE calc_type='ventilator' AND pos BETWEEN 5 AND 8;
UPDATE step_templates SET grp = 'Bock' WHERE calc_type='ventilator' AND pos BETWEEN 9 AND 11;
UPDATE step_templates SET grp = 'Grundrahmen' WHERE calc_type='ventilator' AND pos BETWEEN 12 AND 16;
UPDATE step_templates SET grp = 'Mechanische Bearbeitung' WHERE calc_type='ventilator' AND pos BETWEEN 17 AND 22;
UPDATE step_templates SET grp = 'Düse' WHERE calc_type='ventilator' AND pos BETWEEN 23 AND 27;
UPDATE step_templates SET grp = 'Laufrad' WHERE calc_type='ventilator' AND pos BETWEEN 28 AND 33;
UPDATE step_templates SET grp = 'Schweißkonstruktion' WHERE calc_type='ventilator' AND pos BETWEEN 34 AND 40;
UPDATE step_templates SET grp = 'Oberfläche' WHERE calc_type='ventilator' AND pos = 41;
UPDATE step_templates SET grp = 'Montage' WHERE calc_type='ventilator' AND pos BETWEEN 42 AND 44;
UPDATE step_templates SET grp = 'Prüfung & Doku' WHERE calc_type='ventilator' AND pos BETWEEN 45 AND 46;
UPDATE step_templates SET grp = 'Versand & Sonstiges' WHERE calc_type='ventilator' AND pos BETWEEN 47 AND 49;

UPDATE material_presets SET grp = 'Gehäuse' WHERE calc_type='ventilator' AND pos IN (1, 15, 16);
UPDATE material_presets SET grp = 'Bock' WHERE calc_type='ventilator' AND pos = 2;
UPDATE material_presets SET grp = 'Grundrahmen' WHERE calc_type='ventilator' AND pos IN (3, 6, 7);
UPDATE material_presets SET grp = 'Düse' WHERE calc_type='ventilator' AND pos IN (4, 5, 13);
UPDATE material_presets SET grp = 'Laufrad' WHERE calc_type='ventilator' AND pos IN (8, 9, 10, 11, 12, 26, 27);
UPDATE material_presets SET grp = 'Schutz' WHERE calc_type='ventilator' AND pos IN (17, 18, 19, 22, 23);
UPDATE material_presets SET grp = 'Schalldämpfer' WHERE calc_type='ventilator' AND pos IN (14, 20, 21);
UPDATE material_presets SET grp = 'Isolierung' WHERE calc_type='ventilator' AND pos IN (24, 29, 30, 31, 32, 33, 34);
UPDATE material_presets SET grp = 'Kleinteile & Einkauf' WHERE calc_type='ventilator' AND pos IN (25, 28, 40, 41, 42);
UPDATE material_presets SET grp = 'Externe Leistungen' WHERE calc_type='ventilator' AND pos IN (35, 36, 37, 38, 39);
