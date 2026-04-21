-- ============================================================
-- Migration: Corriger la FK created_by/updated_by vers profiles
-- ============================================================

-- Supprimer les contraintes existantes si elles existent
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_created_by_fkey CASCADE;

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_updated_by_fkey CASCADE;

-- Créer les nouvelles contraintes vers la table profiles
-- (profiles.id est une FK vers auth.users.id, donc cela fonctionne)
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_created_by_profiles
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_updated_by_profiles
  FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
