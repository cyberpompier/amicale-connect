-- Resynchronise une activation existante avec les données actuelles du catalogue global
-- (image, nom, description, stock, variantes), sans écraser le prix personnalisé de l'amicale.
CREATE OR REPLACE FUNCTION public.resync_global_produit(
  p_association_id UUID,
  p_global_produit_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_produit_id UUID;
  v_custom_price DECIMAL;
  v_global RECORD;
BEGIN
  IF NOT public.has_role_in_association(p_association_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT produit_id, custom_price INTO v_produit_id, v_custom_price
  FROM public.boutique_association_produits_partenaires
  WHERE association_id = p_association_id
    AND global_produit_id = p_global_produit_id
    AND is_active = true;

  IF v_produit_id IS NULL THEN
    RAISE EXCEPTION 'Activation introuvable pour ce produit';
  END IF;

  SELECT * INTO v_global FROM public.boutique_global_produits WHERE id = p_global_produit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit du catalogue partagé introuvable';
  END IF;

  UPDATE public.boutique_produits
  SET name = v_global.name,
      description = v_global.description,
      image_url = v_global.image_url,
      base_price = COALESCE(v_custom_price, v_global.base_price),
      stock_status = v_global.stock_status,
      updated_at = now()
  WHERE id = v_produit_id;

  -- Met à jour le modificateur de prix des variantes existantes (appariées par type/valeur)
  UPDATE public.boutique_produit_variantes pv
  SET price_modifier = gv.price_modifier
  FROM public.boutique_global_produit_variantes gv
  WHERE gv.global_produit_id = p_global_produit_id
    AND pv.produit_id = v_produit_id
    AND pv.type = gv.type
    AND pv.value = gv.value;

  -- Ajoute les nouvelles variantes du catalogue global absentes localement
  INSERT INTO public.boutique_produit_variantes (produit_id, type, value, price_modifier)
  SELECT v_produit_id, gv.type, gv.value, gv.price_modifier
  FROM public.boutique_global_produit_variantes gv
  WHERE gv.global_produit_id = p_global_produit_id
    AND NOT EXISTS (
      SELECT 1 FROM public.boutique_produit_variantes pv
      WHERE pv.produit_id = v_produit_id AND pv.type = gv.type AND pv.value = gv.value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
