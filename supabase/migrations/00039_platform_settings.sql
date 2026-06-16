-- ============================================================
-- Migration: Paramètres plateforme (clés API, intégrations)
-- ============================================================
-- Stockage clé/valeur pour les paramètres globaux de la
-- plateforme (ex: clé API Printful), réservé aux
-- administrateurs de la plateforme.
-- ============================================================

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage platform settings"
  ON public.platform_settings
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
