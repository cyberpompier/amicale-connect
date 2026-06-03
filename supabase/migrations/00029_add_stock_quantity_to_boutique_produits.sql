ALTER TABLE public.boutique_produits ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
COMMENT ON COLUMN public.boutique_produits.stock_quantity IS 'Quantité en stock (0 = non géré / illimité si stock_status = in_stock)';
