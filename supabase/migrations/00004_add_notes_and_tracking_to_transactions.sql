-- ============================================================
-- Migration: Ajouter notes et traçabilité aux transactions
-- ============================================================

-- Ajouter les colonnes notes, created_by et updated_by
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ajouter des commentaires
COMMENT ON COLUMN public.transactions.notes IS 'Notes libres sur la transaction';
COMMENT ON COLUMN public.transactions.created_by IS 'Utilisateur qui a créé la transaction';
COMMENT ON COLUMN public.transactions.updated_by IS 'Utilisateur qui a modifié en dernier la transaction';

-- Créer des index pour les recherches
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_by ON public.transactions(updated_by);
