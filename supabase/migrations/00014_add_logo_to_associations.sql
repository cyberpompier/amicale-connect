-- Ajouter colonne logo_url à associations
ALTER TABLE associations ADD COLUMN logo_url text DEFAULT NULL;

COMMENT ON COLUMN associations.logo_url IS 'URL du logo de l''amicale (utilisé dans les reçus PDF)';
