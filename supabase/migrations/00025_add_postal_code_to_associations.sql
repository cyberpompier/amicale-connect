-- Ajouter postal_code à la table associations (pour géocodage des adresses)
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS postal_code TEXT;

COMMENT ON COLUMN public.associations.postal_code IS 'Code postal de la commune — utilisé pour le géocodage des adresses lors des tournées';
