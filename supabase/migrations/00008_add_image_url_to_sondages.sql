-- ============================================================
-- Migration: Ajouter une image bannière aux sondages
-- ============================================================

ALTER TABLE public.sondages
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.sondages.image_url IS 'URL ou base64 de l''image bannière du sondage';
