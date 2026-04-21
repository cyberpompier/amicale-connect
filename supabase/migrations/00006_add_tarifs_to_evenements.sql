-- ============================================================
-- Migration: Ajouter les tarifs amicaliste/extérieur aux événements
-- ============================================================

ALTER TABLE public.evenements
ADD COLUMN IF NOT EXISTS tarif_amicaliste NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS tarif_exterieur NUMERIC(10,2);

COMMENT ON COLUMN public.evenements.tarif_amicaliste IS 'Tarif de participation pour les membres amicalistes';
COMMENT ON COLUMN public.evenements.tarif_exterieur IS 'Tarif de participation pour les invités extérieurs';
