-- Ajout d'un code d'invitation unique par association
ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Générer un code pour les associations existantes
UPDATE public.associations
SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE invite_code IS NULL;

-- Rendre le code obligatoire pour les nouvelles associations (généré automatiquement)
ALTER TABLE public.associations
  ALTER COLUMN invite_code SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

COMMENT ON COLUMN public.associations.invite_code IS 'Code d''invitation 8 caractères pour que les membres rejoignent l''amicale';
