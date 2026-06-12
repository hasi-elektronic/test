-- Baugruppe wird Zuschlagskalkulation mit Baugruppen-Gruppierung (wie Ventilator)
-- Gruppe "Düse" heißt jetzt "Düseneinheit"

UPDATE step_templates SET grp = 'Düseneinheit' WHERE grp = 'Düse';
UPDATE material_presets SET grp = 'Düseneinheit' WHERE grp = 'Düse';

DELETE FROM step_templates WHERE calc_type = 'baugruppe';
INSERT INTO step_templates (calc_type, pos, name, rate, setup_min, grp)
  SELECT 'baugruppe', pos, name, rate, setup_min, grp FROM step_templates WHERE calc_type = 'ventilator';
INSERT INTO material_presets (calc_type, pos, name, comment, supplier, unit_price, grp)
  SELECT 'baugruppe', pos, name, comment, supplier, unit_price, grp FROM material_presets WHERE calc_type = 'ventilator';
