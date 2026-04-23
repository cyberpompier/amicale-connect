-- ============================================================
-- Migration: Module Calendriers (Tournées de vente)
-- ============================================================
-- Gestion complète des tournées calendriers:
-- - Campagnes annuelles avec objectifs
-- - Secteurs géographiques assignables
-- - Équipiers amicalistes par secteur
-- - Pointage des adresses visitées (évite revisite)
-- - Flow de vente avec historique
-- - Gestion stocks calendriers par secteur
-- ============================================================

-- ============================================================
-- 1. CALENDRIER_CAMPAGNES (Campagnes annuelles)
-- ============================================================
CREATE TABLE public.calendrier_campagnes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  objective_amount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (objective_amount >= 0),
  objective_calendriers INTEGER DEFAULT 0 NOT NULL CHECK (objective_calendriers >= 0),
  unit_price DECIMAL(10,2) DEFAULT 10.00 NOT NULL CHECK (unit_price > 0),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'closed', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(association_id, year, name)
);

ALTER TABLE public.calendrier_campagnes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_campagnes_association_id ON public.calendrier_campagnes(association_id);
CREATE INDEX idx_calendrier_campagnes_status ON public.calendrier_campagnes(status);
CREATE INDEX idx_calendrier_campagnes_year ON public.calendrier_campagnes(year);

-- ============================================================
-- 2. CALENDRIER_SECTEURS (Secteurs géographiques)
-- ============================================================
CREATE TABLE public.calendrier_secteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  campagne_id UUID NOT NULL REFERENCES public.calendrier_campagnes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  objective_amount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (objective_amount >= 0),
  objective_calendriers INTEGER DEFAULT 30 NOT NULL CHECK (objective_calendriers >= 0),
  color TEXT DEFAULT '#EF4444',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.calendrier_secteurs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_secteurs_association_id ON public.calendrier_secteurs(association_id);
CREATE INDEX idx_calendrier_secteurs_campagne_id ON public.calendrier_secteurs(campagne_id);
CREATE INDEX idx_calendrier_secteurs_status ON public.calendrier_secteurs(status);

-- ============================================================
-- 3. CALENDRIER_SECTEUR_RUES (Rues composant un secteur)
-- ============================================================
CREATE TABLE public.calendrier_secteur_rues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(secteur_id, name)
);

ALTER TABLE public.calendrier_secteur_rues ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_secteur_rues_secteur_id ON public.calendrier_secteur_rues(secteur_id);

-- ============================================================
-- 4. CALENDRIER_SECTEUR_EQUIPIERS (Amicalistes assignés)
-- ============================================================
CREATE TABLE public.calendrier_secteur_equipiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  amicaliste_id UUID NOT NULL REFERENCES public.amicalistes(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'equipier' NOT NULL CHECK (role IN ('responsable', 'equipier')),
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(secteur_id, amicaliste_id)
);

ALTER TABLE public.calendrier_secteur_equipiers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_equipiers_secteur_id ON public.calendrier_secteur_equipiers(secteur_id);
CREATE INDEX idx_calendrier_equipiers_amicaliste_id ON public.calendrier_secteur_equipiers(amicaliste_id);

-- ============================================================
-- 5. CALENDRIER_ADRESSES (Pointage des adresses visitées)
-- ============================================================
CREATE TABLE public.calendrier_adresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  street_name TEXT NOT NULL,
  number TEXT,
  building TEXT,
  status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'done', 'absent', 'refuse', 'skip')),
  visited_at TIMESTAMPTZ,
  visited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.calendrier_adresses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_adresses_secteur_id ON public.calendrier_adresses(secteur_id);
CREATE INDEX idx_calendrier_adresses_status ON public.calendrier_adresses(status);
CREATE INDEX idx_calendrier_adresses_street_number ON public.calendrier_adresses(secteur_id, street_name, number);

-- ============================================================
-- 6. CALENDRIER_VENTES (Ventes / Dons reçus)
-- ============================================================
CREATE TABLE public.calendrier_ventes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  campagne_id UUID NOT NULL REFERENCES public.calendrier_campagnes(id) ON DELETE CASCADE,
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  amicaliste_id UUID REFERENCES public.amicalistes(id) ON DELETE SET NULL,
  adresse_id UUID REFERENCES public.calendrier_adresses(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  payment_method TEXT DEFAULT 'cash' NOT NULL CHECK (payment_method IN ('cash', 'check', 'card', 'transfer', 'other')),
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  donor_address TEXT,
  notes TEXT,
  sale_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.calendrier_ventes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_ventes_association_id ON public.calendrier_ventes(association_id);
CREATE INDEX idx_calendrier_ventes_campagne_id ON public.calendrier_ventes(campagne_id);
CREATE INDEX idx_calendrier_ventes_secteur_id ON public.calendrier_ventes(secteur_id);
CREATE INDEX idx_calendrier_ventes_amicaliste_id ON public.calendrier_ventes(amicaliste_id);
CREATE INDEX idx_calendrier_ventes_sale_date ON public.calendrier_ventes(sale_date);

-- ============================================================
-- 7. CALENDRIER_STOCKS (Gestion des stocks par secteur)
-- ============================================================
CREATE TABLE public.calendrier_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secteur_id UUID NOT NULL REFERENCES public.calendrier_secteurs(id) ON DELETE CASCADE,
  allocated_qty INTEGER DEFAULT 0 NOT NULL CHECK (allocated_qty >= 0),
  used_qty INTEGER DEFAULT 0 NOT NULL CHECK (used_qty >= 0),
  returned_qty INTEGER DEFAULT 0 NOT NULL CHECK (returned_qty >= 0),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(secteur_id)
);

ALTER TABLE public.calendrier_stocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calendrier_stocks_secteur_id ON public.calendrier_stocks(secteur_id);

-- ============================================================
-- RLS POLICIES - CAMPAGNES
-- ============================================================
CREATE POLICY "campagnes_select" ON public.calendrier_campagnes
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "campagnes_insert" ON public.calendrier_campagnes
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "campagnes_update" ON public.calendrier_campagnes
  FOR UPDATE USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "campagnes_delete" ON public.calendrier_campagnes
  FOR DELETE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- ============================================================
-- RLS POLICIES - SECTEURS
-- ============================================================
CREATE POLICY "secteurs_select" ON public.calendrier_secteurs
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "secteurs_insert" ON public.calendrier_secteurs
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "secteurs_update" ON public.calendrier_secteurs
  FOR UPDATE USING (
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "secteurs_delete" ON public.calendrier_secteurs
  FOR DELETE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- ============================================================
-- RLS POLICIES - SECTEUR RUES (hérité du secteur)
-- ============================================================
CREATE POLICY "secteur_rues_select" ON public.calendrier_secteur_rues
  FOR SELECT USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "secteur_rues_insert" ON public.calendrier_secteur_rues
  FOR INSERT WITH CHECK (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "secteur_rues_update" ON public.calendrier_secteur_rues
  FOR UPDATE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "secteur_rues_delete" ON public.calendrier_secteur_rues
  FOR DELETE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

-- ============================================================
-- RLS POLICIES - EQUIPIERS (hérité du secteur)
-- ============================================================
CREATE POLICY "equipiers_select" ON public.calendrier_secteur_equipiers
  FOR SELECT USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "equipiers_insert" ON public.calendrier_secteur_equipiers
  FOR INSERT WITH CHECK (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "equipiers_update" ON public.calendrier_secteur_equipiers
  FOR UPDATE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "equipiers_delete" ON public.calendrier_secteur_equipiers
  FOR DELETE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

-- ============================================================
-- RLS POLICIES - ADRESSES (hérité du secteur)
-- ============================================================
CREATE POLICY "adresses_select" ON public.calendrier_adresses
  FOR SELECT USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "adresses_insert" ON public.calendrier_adresses
  FOR INSERT WITH CHECK (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "adresses_update" ON public.calendrier_adresses
  FOR UPDATE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "adresses_delete" ON public.calendrier_adresses
  FOR DELETE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

-- ============================================================
-- RLS POLICIES - VENTES
-- ============================================================
CREATE POLICY "ventes_select" ON public.calendrier_ventes
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "ventes_insert" ON public.calendrier_ventes
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "ventes_update" ON public.calendrier_ventes
  FOR UPDATE USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    (created_by = auth.uid() OR public.has_role_in_association(association_id, ARRAY['owner', 'admin']))
  );

CREATE POLICY "ventes_delete" ON public.calendrier_ventes
  FOR DELETE USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    (created_by = auth.uid() OR public.has_role_in_association(association_id, ARRAY['owner', 'admin']))
  );

-- ============================================================
-- RLS POLICIES - STOCKS (hérité du secteur)
-- ============================================================
CREATE POLICY "stocks_select" ON public.calendrier_stocks
  FOR SELECT USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "stocks_insert" ON public.calendrier_stocks
  FOR INSERT WITH CHECK (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "stocks_update" ON public.calendrier_stocks
  FOR UPDATE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "stocks_delete" ON public.calendrier_stocks
  FOR DELETE USING (
    secteur_id IN (SELECT id FROM public.calendrier_secteurs WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

-- ============================================================
-- FONCTION: Auto-update status secteur selon activité
-- ============================================================
CREATE OR REPLACE FUNCTION public.calendrier_update_secteur_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si au moins une vente enregistrée → au moins in_progress
  IF EXISTS (SELECT 1 FROM public.calendrier_ventes WHERE secteur_id = NEW.secteur_id) THEN
    UPDATE public.calendrier_secteurs
    SET status = CASE
      WHEN status = 'todo' THEN 'in_progress'
      ELSE status
    END,
    updated_at = now()
    WHERE id = NEW.secteur_id AND status = 'todo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_vente_update_secteur
AFTER INSERT ON public.calendrier_ventes
FOR EACH ROW EXECUTE FUNCTION public.calendrier_update_secteur_status();

-- ============================================================
-- FONCTION: Marquer adresse comme visitée après vente
-- ============================================================
CREATE OR REPLACE FUNCTION public.calendrier_mark_adresse_done()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.adresse_id IS NOT NULL THEN
    UPDATE public.calendrier_adresses
    SET status = 'done',
        visited_at = now(),
        visited_by = NEW.created_by,
        updated_at = now()
    WHERE id = NEW.adresse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_vente_mark_adresse
AFTER INSERT ON public.calendrier_ventes
FOR EACH ROW EXECUTE FUNCTION public.calendrier_mark_adresse_done();

-- ============================================================
-- COMMENTAIRES
-- ============================================================
COMMENT ON TABLE public.calendrier_campagnes IS 'Campagnes annuelles de tournée calendriers';
COMMENT ON TABLE public.calendrier_secteurs IS 'Secteurs géographiques d''une campagne';
COMMENT ON TABLE public.calendrier_secteur_rues IS 'Rues composant un secteur';
COMMENT ON TABLE public.calendrier_secteur_equipiers IS 'Amicalistes assignés à un secteur';
COMMENT ON TABLE public.calendrier_adresses IS 'Adresses pointées pour éviter revisite';
COMMENT ON TABLE public.calendrier_ventes IS 'Dons/ventes reçus lors de la tournée';
COMMENT ON TABLE public.calendrier_stocks IS 'Stock de calendriers alloué par secteur';
