-- ============================================================
-- Migration: Ajouter le champ libelle à la table cotisations
-- ============================================================

-- Ajouter la colonne libelle si elle n'existe pas
ALTER TABLE public.cotisations
ADD COLUMN IF NOT EXISTS libelle TEXT DEFAULT 'Cotisation' NOT NULL;

-- Ajouter un commentaire
COMMENT ON COLUMN public.cotisations.libelle IS 'Libellé ou intitulé de la cotisation (ex: Cotisation annuelle 2026)';
