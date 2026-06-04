ALTER TABLE public.boutique_produits ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0 NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100);
COMMENT ON COLUMN public.boutique_produits.discount_percent IS 'Pourcentage de remise sur le produit (0-100%)';
