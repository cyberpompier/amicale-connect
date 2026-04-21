-- ============================================================
-- Fix: RLS boutique_commande_items
-- La sous-requête dans la policy INSERT était bloquée par la
-- RLS de boutique_commandes elle-même (boucle RLS).
-- Solution: fonctions SECURITY DEFINER qui bypassent la RLS.
-- ============================================================

-- Fonction helper qui vérifie la propriété d'une commande sans RLS
CREATE OR REPLACE FUNCTION public.user_owns_commande(_commande_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boutique_commandes
    WHERE id = _commande_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fonction helper pour lire les items d'une commande sans RLS
CREATE OR REPLACE FUNCTION public.user_can_read_commande(_commande_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boutique_commandes c
    WHERE c.id = _commande_id
      AND (
        c.user_id = auth.uid()
        OR public.has_role_in_association(c.association_id, ARRAY['owner', 'admin'])
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Supprimer les anciennes policies buggées
DROP POLICY IF EXISTS "commande_items_select" ON public.boutique_commande_items;
DROP POLICY IF EXISTS "commande_items_insert" ON public.boutique_commande_items;

-- Recréer avec les fonctions SECURITY DEFINER
CREATE POLICY "commande_items_select" ON public.boutique_commande_items
  FOR SELECT USING (public.user_can_read_commande(commande_id));

CREATE POLICY "commande_items_insert" ON public.boutique_commande_items
  FOR INSERT WITH CHECK (public.user_owns_commande(commande_id));

CREATE POLICY "commande_items_update" ON public.boutique_commande_items
  FOR UPDATE USING (public.user_can_read_commande(commande_id));

CREATE POLICY "commande_items_delete" ON public.boutique_commande_items
  FOR DELETE USING (public.user_owns_commande(commande_id));
