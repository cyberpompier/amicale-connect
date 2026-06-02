-- Ajouter la ville aux secteurs (pour géocodage précis des adresses)
ALTER TABLE public.calendrier_secteurs
ADD COLUMN IF NOT EXISTS city TEXT;

-- Même chose sur les templates
ALTER TABLE public.calendrier_secteurs_templates
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.calendrier_secteurs.city IS 'Commune couverte par ce secteur — utilisée pour le géocodage des adresses';
COMMENT ON COLUMN public.calendrier_secteurs_templates.city IS 'Commune couverte par ce secteur template';
