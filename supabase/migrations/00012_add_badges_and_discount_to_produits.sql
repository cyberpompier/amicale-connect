-- ============================================================
-- Migration: Ajouter badges et remise aux produits boutique
-- ============================================================

-- Ajouter la colonne badges (array de texte pour stocker les badges)
ALTER TABLE public.boutique_produits
ADD COLUMN badges TEXT[] DEFAULT '{}' NOT NULL;

-- Ajouter la colonne discount_percent (remise en pourcentage)
ALTER TABLE public.boutique_produits
ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Index pour les recherches
CREATE INDEX idx_boutique_produits_badges ON public.boutique_produits USING GIN(badges);

-- Commenter les colonnes
COMMENT ON COLUMN public.boutique_produits.badges IS 'Badges (tableau): exclusif, promotion, liquidation, etc.';
COMMENT ON COLUMN public.boutique_produits.discount_percent IS 'Remise en pourcentage (0-100%)';
