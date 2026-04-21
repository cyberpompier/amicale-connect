-- ============================================================
-- Migration: Autoriser les membres à supprimer les transactions
-- (nécessaire pour l'annulation de paiement d'événement)
-- ============================================================

DROP POLICY IF EXISTS "Manage transactions" ON public.transactions;

-- Recréer la policy en autorisant owner, admin ET member
CREATE POLICY "Manage transactions" ON public.transactions FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member']))
  WITH CHECK (public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member']));
