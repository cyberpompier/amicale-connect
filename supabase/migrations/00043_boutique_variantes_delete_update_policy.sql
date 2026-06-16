-- Ajoute les policies DELETE/UPDATE manquantes sur boutique_produit_variantes,
-- nécessaires pour permettre l'édition des variantes depuis le formulaire article.
CREATE POLICY "variantes_delete" ON public.boutique_produit_variantes
  FOR DELETE USING (
    produit_id IN (SELECT id FROM public.boutique_produits WHERE
      association_id IN (SELECT public.get_user_association_ids()) AND
      (created_by = auth.uid() OR public.has_role_in_association(association_id, ARRAY['owner', 'admin']))
    )
  );

CREATE POLICY "variantes_update" ON public.boutique_produit_variantes
  FOR UPDATE USING (
    produit_id IN (SELECT id FROM public.boutique_produits WHERE
      association_id IN (SELECT public.get_user_association_ids()) AND
      (created_by = auth.uid() OR public.has_role_in_association(association_id, ARRAY['owner', 'admin']))
    )
  );
