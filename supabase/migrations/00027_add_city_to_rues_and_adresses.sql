-- Ajouter city sur les rues des secteurs (chaque rue connaît sa commune)
ALTER TABLE public.calendrier_secteur_rues
ADD COLUMN IF NOT EXISTS city TEXT;

-- Ajouter city sur les rues des templates
ALTER TABLE public.calendrier_secteurs_templates_rues
ADD COLUMN IF NOT EXISTS city TEXT;

-- Ajouter city sur les adresses (héritée de la rue au moment de la création)
ALTER TABLE public.calendrier_adresses
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.calendrier_secteur_rues.city IS 'Commune de cette rue (peut différer de la ville du secteur)';
COMMENT ON COLUMN public.calendrier_adresses.city IS 'Commune de l''adresse — utilisée pour le géocodage précis';
