-- ============================================================
-- Migration: Ajouter géolocalisation aux adresses calendriers
-- ============================================================

ALTER TABLE public.calendrier_adresses
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN geocoded_at TIMESTAMPTZ;

CREATE INDEX idx_calendrier_adresses_coordinates ON public.calendrier_adresses(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.calendrier_adresses.latitude IS 'Latitude de l''adresse (pour géolocalisation)';
COMMENT ON COLUMN public.calendrier_adresses.longitude IS 'Longitude de l''adresse (pour géolocalisation)';
COMMENT ON COLUMN public.calendrier_adresses.geocoded_at IS 'Date du dernier géocodage';
