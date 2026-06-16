-- ============================================================
-- Migration: Rendre prenom optionnel dans donateurs
-- ============================================================

ALTER TABLE public.donateurs
  ALTER COLUMN prenom DROP NOT NULL;

ALTER TABLE public.donateurs
  ALTER COLUMN ville SET NOT NULL;
