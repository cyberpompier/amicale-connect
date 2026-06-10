-- ============================================================
-- Migration: Statistiques plateforme - Catalogue partagé
-- ============================================================
-- Fonction réservée aux administrateurs de la plateforme,
-- agrégeant pour chaque produit du catalogue partagé :
-- nombre d'amicales l'ayant activé, revenus générés et
-- commission Amicale Connect correspondante.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_platform_dropshipping_stats()
RETURNS TABLE (
  global_produit_id UUID,
  product_name TEXT,
  nb_associations_actives BIGINT,
  total_revenue DECIMAL,
  total_commission DECIMAL
) AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    gp.id,
    gp.name,
    (
      SELECT COUNT(*) FROM public.boutique_association_produits_partenaires app
      WHERE app.global_produit_id = gp.id AND app.is_active = true
    ),
    COALESCE(SUM(bci.total_price), 0)::DECIMAL,
    COALESCE(SUM(bci.total_price * bv.commission_percent / 100), 0)::DECIMAL
  FROM public.boutique_global_produits gp
  LEFT JOIN public.boutique_produits bp ON bp.global_produit_id = gp.id
  LEFT JOIN public.boutique_vendors bv ON bv.id = bp.vendor_id
  LEFT JOIN public.boutique_commande_items bci ON bci.produit_id = bp.id
  LEFT JOIN public.boutique_commandes bc ON bc.id = bci.commande_id AND bc.payment_status = 'completed'
  WHERE bci.id IS NULL OR bc.id IS NOT NULL
  GROUP BY gp.id, gp.name
  ORDER BY gp.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
