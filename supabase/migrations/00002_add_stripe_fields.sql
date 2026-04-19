-- ============================================================
-- Migration: Ajouter les champs Stripe à la table associations
-- ============================================================

-- Ajouter les colonnes Stripe si elles n'existent pas
ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing' NOT NULL
  CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid'));

-- Mettre à jour les colonnes existantes si besoin
UPDATE public.associations
SET subscription_status = 'trialing'
WHERE subscription_status IS NULL;

-- Ajouter un index sur stripe_customer_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_associations_stripe_customer_id
ON public.associations(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_associations_subscription_status
ON public.associations(subscription_status);
