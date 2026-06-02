-- ============================================================
-- Table: Historique des mouvements de stock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calendrier_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  campagne_id UUID NOT NULL REFERENCES public.calendrier_campagnes(id) ON DELETE CASCADE,
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  secteur_name TEXT NOT NULL,
  from_qty INTEGER NOT NULL CHECK (from_qty >= 0),
  to_qty INTEGER NOT NULL CHECK (to_qty >= 0),
  action TEXT NOT NULL CHECK (action IN ('redistribution_in', 'redistribution_out', 'allocation_initial', 'usage_recorded', 'return_recorded')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.calendrier_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_stock_movements_association ON public.calendrier_stock_movements(association_id);
CREATE INDEX idx_stock_movements_campagne ON public.calendrier_stock_movements(campagne_id);
CREATE INDEX idx_stock_movements_secteur ON public.calendrier_stock_movements(secteur_id);
CREATE INDEX idx_stock_movements_created_at ON public.calendrier_stock_movements(created_at);

-- ============================================================
-- RLS POLICIES - STOCK MOVEMENTS
-- ============================================================

CREATE POLICY "stock_movements_select" ON public.calendrier_stock_movements
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "stock_movements_insert" ON public.calendrier_stock_movements
  FOR INSERT WITH CHECK (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "stock_movements_update" ON public.calendrier_stock_movements
  FOR UPDATE USING (association_id IN (SELECT public.get_user_association_ids()));

COMMENT ON TABLE public.calendrier_stock_movements IS 'Historique de tous les mouvements de stock (redistributions, allocations, retours)';
