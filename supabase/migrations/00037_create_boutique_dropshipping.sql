-- ============================================================
-- Migration: Boutique Dropshipping (Catalogue Partagé)
-- ============================================================
-- Permet à Amicale Connect de proposer un catalogue de produits
-- en dropshipping, activable individuellement par chaque amicale,
-- en complément de leur boutique locale.
-- ============================================================

-- ============================================================
-- 1. PLATFORM_ADMINS (Administrateurs de la plateforme)
-- ============================================================
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "platform_admins_select" ON public.platform_admins
  FOR SELECT USING (public.is_platform_admin());

-- Seed: cyberpompier@gmail.com comme premier administrateur plateforme
INSERT INTO public.platform_admins (user_id)
VALUES ('e8eeb363-fec6-47f9-b3cf-74bdc50ee852')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. BOUTIQUE_GLOBAL_PRODUITS (Catalogue partagé / dropshipping)
-- ============================================================
CREATE TABLE public.boutique_global_produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category_name TEXT,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0), -- prix de vente conseillé
  commission_percent DECIMAL(5,2) DEFAULT 20.00 NOT NULL,   -- part Amicale Connect
  sku TEXT UNIQUE,
  stock_status TEXT DEFAULT 'in_stock' NOT NULL CHECK (stock_status IN ('in_stock', 'out_of_stock', 'coming_soon')),
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.boutique_global_produits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_global_produits_status ON public.boutique_global_produits(status);

-- ============================================================
-- 3. BOUTIQUE_GLOBAL_PRODUIT_VARIANTES
-- ============================================================
CREATE TABLE public.boutique_global_produit_variantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_produit_id UUID NOT NULL REFERENCES public.boutique_global_produits(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('size', 'color', 'material', 'custom')),
  value TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(global_produit_id, type, value)
);

ALTER TABLE public.boutique_global_produit_variantes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_global_variantes_produit_id ON public.boutique_global_produit_variantes(global_produit_id);

-- ============================================================
-- 4. ÉVOLUTIONS DES TABLES EXISTANTES
-- ============================================================

-- Vendor "plateforme": vendeur spécial représentant Amicale Connect
-- au sein de chaque association lorsqu'elle active un produit du catalogue partagé
ALTER TABLE public.boutique_vendors ADD COLUMN is_platform BOOLEAN DEFAULT false NOT NULL;

-- Lien produit local <-> produit du catalogue global (pour synchronisation)
ALTER TABLE public.boutique_produits ADD COLUMN global_produit_id UUID REFERENCES public.boutique_global_produits(id) ON DELETE SET NULL;
CREATE INDEX idx_boutique_produits_global_produit_id ON public.boutique_produits(global_produit_id);

-- Permet de désactiver un produit (local ou partenaire) sans le supprimer
ALTER TABLE public.boutique_produits ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- ============================================================
-- 5. BOUTIQUE_ASSOCIATION_PRODUITS_PARTENAIRES (Activation par amicale)
-- ============================================================
CREATE TABLE public.boutique_association_produits_partenaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  global_produit_id UUID NOT NULL REFERENCES public.boutique_global_produits(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES public.boutique_produits(id) ON DELETE SET NULL, -- copie locale créée à l'activation
  is_active BOOLEAN DEFAULT true NOT NULL,
  custom_price DECIMAL(10,2), -- override optionnel du prix de vente conseillé
  activated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(association_id, global_produit_id)
);

ALTER TABLE public.boutique_association_produits_partenaires ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_assoc_partenaires_association_id ON public.boutique_association_produits_partenaires(association_id);
CREATE INDEX idx_boutique_assoc_partenaires_global_produit_id ON public.boutique_association_produits_partenaires(global_produit_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- GLOBAL PRODUITS: visibles par tous les utilisateurs connectés (s'ils sont actifs),
-- gestion réservée aux administrateurs de la plateforme
CREATE POLICY "global_produits_select" ON public.boutique_global_produits
  FOR SELECT USING (
    status = 'active' OR public.is_platform_admin()
  );

CREATE POLICY "global_produits_admin_all" ON public.boutique_global_produits
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- GLOBAL VARIANTES: héritées du produit global
CREATE POLICY "global_variantes_select" ON public.boutique_global_produit_variantes
  FOR SELECT USING (
    global_produit_id IN (
      SELECT id FROM public.boutique_global_produits WHERE status = 'active'
    ) OR public.is_platform_admin()
  );

CREATE POLICY "global_variantes_admin_all" ON public.boutique_global_produit_variantes
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ASSOCIATION_PRODUITS_PARTENAIRES: visibles par les membres de l'association,
-- modifiables par owner/admin de l'association
CREATE POLICY "assoc_partenaires_select" ON public.boutique_association_produits_partenaires
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "assoc_partenaires_modify" ON public.boutique_association_produits_partenaires
  FOR ALL USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  )
  WITH CHECK (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- ============================================================
-- 6. FONCTIONS D'ACTIVATION / DÉSACTIVATION
-- ============================================================

-- Active un produit du catalogue global pour une association:
-- crée (ou réutilise) le vendeur "plateforme" de l'association,
-- copie le produit (et ses variantes) dans boutique_produits,
-- et enregistre l'activation.
CREATE OR REPLACE FUNCTION public.activate_global_produit(
  p_association_id UUID,
  p_global_produit_id UUID,
  p_custom_price DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_vendor_id UUID;
  v_produit_id UUID;
  v_global RECORD;
BEGIN
  IF NOT public.has_role_in_association(p_association_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT * INTO v_global FROM public.boutique_global_produits
  WHERE id = p_global_produit_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit du catalogue partagé introuvable ou inactif';
  END IF;

  -- Récupère ou crée le vendeur "plateforme" pour cette association
  SELECT id INTO v_vendor_id FROM public.boutique_vendors
  WHERE association_id = p_association_id AND is_platform = true;

  IF v_vendor_id IS NULL THEN
    INSERT INTO public.boutique_vendors (association_id, name, description, is_primary, is_platform, commission_percent, status)
    VALUES (p_association_id, 'Amicale Connect (Partenaire)', 'Catalogue partagé en dropshipping', false, true, v_global.commission_percent, 'active')
    RETURNING id INTO v_vendor_id;
  END IF;

  -- Réactive une activation existante si elle existe déjà
  SELECT produit_id INTO v_produit_id FROM public.boutique_association_produits_partenaires
  WHERE association_id = p_association_id AND global_produit_id = p_global_produit_id;

  IF v_produit_id IS NOT NULL THEN
    UPDATE public.boutique_produits
    SET is_active = true,
        base_price = COALESCE(p_custom_price, v_global.base_price),
        stock_status = v_global.stock_status,
        updated_at = now()
    WHERE id = v_produit_id;
  ELSE
    INSERT INTO public.boutique_produits (
      association_id, vendor_id, name, description, image_url, base_price,
      stock_status, payment_type, global_produit_id, created_by
    ) VALUES (
      p_association_id, v_vendor_id, v_global.name, v_global.description, v_global.image_url,
      COALESCE(p_custom_price, v_global.base_price),
      v_global.stock_status, 'stripe', p_global_produit_id, auth.uid()
    )
    RETURNING id INTO v_produit_id;

    -- Copie les variantes du produit global
    INSERT INTO public.boutique_produit_variantes (produit_id, type, value, price_modifier)
    SELECT v_produit_id, type, value, price_modifier
    FROM public.boutique_global_produit_variantes
    WHERE global_produit_id = p_global_produit_id;
  END IF;

  -- Enregistre/maj l'activation
  INSERT INTO public.boutique_association_produits_partenaires (association_id, global_produit_id, produit_id, is_active, custom_price)
  VALUES (p_association_id, p_global_produit_id, v_produit_id, true, p_custom_price)
  ON CONFLICT (association_id, global_produit_id)
  DO UPDATE SET produit_id = EXCLUDED.produit_id, is_active = true, custom_price = EXCLUDED.custom_price;

  RETURN v_produit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Désactive un produit du catalogue partagé pour une association
-- (le produit local est masqué mais conservé pour l'historique des commandes)
CREATE OR REPLACE FUNCTION public.deactivate_global_produit(
  p_association_id UUID,
  p_global_produit_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_produit_id UUID;
BEGIN
  IF NOT public.has_role_in_association(p_association_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT produit_id INTO v_produit_id FROM public.boutique_association_produits_partenaires
  WHERE association_id = p_association_id AND global_produit_id = p_global_produit_id;

  UPDATE public.boutique_association_produits_partenaires
  SET is_active = false
  WHERE association_id = p_association_id AND global_produit_id = p_global_produit_id;

  IF v_produit_id IS NOT NULL THEN
    UPDATE public.boutique_produits SET is_active = false WHERE id = v_produit_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
