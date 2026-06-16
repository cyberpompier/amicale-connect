-- ============================================================
-- Migration: Envoi des commandes dropshipping à Printful
-- ============================================================
-- Ajoute une adresse de livraison structurée sur les commandes,
-- le suivi de l'envoi à Printful, et les identifiants de variantes
-- Printful sur le catalogue global.
-- ============================================================

ALTER TABLE public.boutique_commandes
  ADD COLUMN shipping_name TEXT,
  ADD COLUMN shipping_address1 TEXT,
  ADD COLUMN shipping_address2 TEXT,
  ADD COLUMN shipping_city TEXT,
  ADD COLUMN shipping_zip TEXT,
  ADD COLUMN shipping_country TEXT DEFAULT 'FR',
  ADD COLUMN printful_order_id TEXT,
  ADD COLUMN printful_status TEXT;

ALTER TABLE public.boutique_global_produit_variantes
  ADD COLUMN printful_variant_id BIGINT;

ALTER TABLE public.boutique_global_produits
  ADD COLUMN printful_sync_variant_id BIGINT;
