-- ─────────────────────────────────────────────────────────────
-- 1. Décrémente le stock produit + variante à l'ajout d'un item
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_decrement_stock_on_item_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Stock global du produit (0 = illimité, on ne touche pas)
  UPDATE public.boutique_produits
  SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at     = now()
  WHERE id = NEW.produit_id
    AND stock_quantity > 0;

  -- Stock de la variante si applicable
  IF NEW.variante_id IS NOT NULL THEN
    UPDATE public.boutique_produit_variantes
    SET stock_qty = GREATEST(0, stock_qty - NEW.quantity)
    WHERE id = NEW.variante_id
      AND stock_qty > 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_decrement_stock_on_item_insert
  AFTER INSERT ON public.boutique_commande_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_decrement_stock_on_item_insert();

-- ─────────────────────────────────────────────────────────────
-- 2. Restaure le stock quand une commande passe à "cancelled"
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Seulement si le statut passe vers "cancelled"
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN

    -- Restaurer le stock produit pour chaque item
    UPDATE public.boutique_produits bp
    SET stock_quantity = bp.stock_quantity + ci.quantity,
        updated_at     = now()
    FROM public.boutique_commande_items ci
    WHERE ci.commande_id = NEW.id
      AND ci.produit_id  = bp.id
      AND bp.stock_quantity > 0;

    -- Restaurer le stock variante
    UPDATE public.boutique_produit_variantes bv
    SET stock_qty = bv.stock_qty + ci.quantity
    FROM public.boutique_commande_items ci
    WHERE ci.commande_id  = NEW.id
      AND ci.variante_id  = bv.id
      AND bv.stock_qty   >= 0;

  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF status ON public.boutique_commandes
  FOR EACH ROW EXECUTE FUNCTION public.fn_restore_stock_on_cancel();

-- ─────────────────────────────────────────────────────────────
-- 3. Passe automatiquement stock_status à "out_of_stock"
--    quand stock_quantity tombe à 0, et repasse à "in_stock"
--    si le stock est rechargé
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_out_of_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
    NEW.stock_status := 'out_of_stock';
  END IF;
  IF NEW.stock_quantity > 0 AND OLD.stock_status = 'out_of_stock' THEN
    NEW.stock_status := 'in_stock';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_out_of_stock
  BEFORE UPDATE OF stock_quantity ON public.boutique_produits
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_out_of_stock();
