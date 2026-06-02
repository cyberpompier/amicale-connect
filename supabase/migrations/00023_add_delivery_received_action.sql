-- ============================================================
-- Migration: Add 'delivery_received' action type to stock movements
-- ============================================================

-- Drop the old constraint and add new one with additional action type
ALTER TABLE public.calendrier_stock_movements
DROP CONSTRAINT calendrier_stock_movements_action_check;

ALTER TABLE public.calendrier_stock_movements
ADD CONSTRAINT calendrier_stock_movements_action_check
CHECK (action IN ('redistribution_in', 'redistribution_out', 'allocation_initial', 'usage_recorded', 'return_recorded', 'delivery_received'));

COMMENT ON TABLE public.calendrier_stock_movements IS 'Historique de tous les mouvements de stock (redistributions, allocations, retours, livraisons)';
