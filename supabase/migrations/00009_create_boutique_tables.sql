-- ============================================================
-- Migration: Boutique E-Commerce Marketplace
-- ============================================================

-- ============================================================
-- 1. BOUTIQUE_VENDORS (Vendeurs: l'amicale + commerçants)
-- ============================================================
CREATE TABLE public.boutique_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_primary BOOLEAN DEFAULT false NOT NULL, -- L'amicale = primary vendor
  commission_percent DECIMAL(5,2) DEFAULT 5.00 NOT NULL, -- % plateforme
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
  bank_account_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(association_id, name)
);

ALTER TABLE public.boutique_vendors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. BOUTIQUE_CATEGORIES (Catégories produits)
-- ============================================================
CREATE TABLE public.boutique_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  "order" INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(association_id, name)
);

ALTER TABLE public.boutique_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. BOUTIQUE_PRODUITS (Produits)
-- ============================================================
CREATE TABLE public.boutique_produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.boutique_vendors(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.boutique_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  stock_status TEXT DEFAULT 'in_stock' NOT NULL CHECK (stock_status IN ('in_stock', 'out_of_stock', 'coming_soon')),
  payment_type TEXT DEFAULT 'stripe' NOT NULL CHECK (payment_type IN ('stripe', 'manual', 'both')),
  sku TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.boutique_produits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_produits_association_id ON public.boutique_produits(association_id);
CREATE INDEX idx_boutique_produits_vendor_id ON public.boutique_produits(vendor_id);
CREATE INDEX idx_boutique_produits_category_id ON public.boutique_produits(category_id);

-- ============================================================
-- 4. BOUTIQUE_PRODUIT_VARIANTES (Variantes: tailles, couleurs)
-- ============================================================
CREATE TABLE public.boutique_produit_variantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produit_id UUID NOT NULL REFERENCES public.boutique_produits(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('size', 'color', 'material', 'custom')),
  value TEXT NOT NULL,
  stock_qty INTEGER DEFAULT 0 NOT NULL CHECK (stock_qty >= 0),
  sku_variant TEXT UNIQUE,
  price_modifier DECIMAL(10,2) DEFAULT 0 NOT NULL, -- Surcoût variante (+/-)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(produit_id, type, value)
);

ALTER TABLE public.boutique_produit_variantes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_variantes_produit_id ON public.boutique_produit_variantes(produit_id);

-- ============================================================
-- 5. BOUTIQUE_PANIER (Shopping Cart)
-- ============================================================
CREATE TABLE public.boutique_panier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES public.boutique_produits(id) ON DELETE CASCADE,
  variante_id UUID REFERENCES public.boutique_produit_variantes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '15 days'),
  UNIQUE(user_id, produit_id, variante_id)
);

ALTER TABLE public.boutique_panier ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_panier_user_id ON public.boutique_panier(user_id);
CREATE INDEX idx_boutique_panier_association_id ON public.boutique_panier(association_id);

-- ============================================================
-- 6. BOUTIQUE_COMMANDES (Orders)
-- ============================================================
CREATE TABLE public.boutique_commandes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (tax_amount >= 0),
  shipping_address TEXT,
  payment_method TEXT DEFAULT 'stripe' NOT NULL CHECK (payment_method IN ('stripe', 'manual')),
  payment_status TEXT DEFAULT 'pending' NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')),
  stripe_payment_intent_id TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.boutique_commandes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_commandes_association_id ON public.boutique_commandes(association_id);
CREATE INDEX idx_boutique_commandes_user_id ON public.boutique_commandes(user_id);
CREATE INDEX idx_boutique_commandes_status ON public.boutique_commandes(status);

-- ============================================================
-- 7. BOUTIQUE_COMMANDE_ITEMS (Order Line Items)
-- ============================================================
CREATE TABLE public.boutique_commande_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES public.boutique_commandes(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES public.boutique_produits(id) ON DELETE RESTRICT,
  variante_id UUID REFERENCES public.boutique_produit_variantes(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.boutique_commande_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_commande_items_commande_id ON public.boutique_commande_items(commande_id);
CREATE INDEX idx_boutique_commande_items_produit_id ON public.boutique_commande_items(produit_id);

-- ============================================================
-- 8. BOUTIQUE_PAIEMENTS (Payment Records - Stripe Integration)
-- ============================================================
CREATE TABLE public.boutique_paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  commande_id UUID NOT NULL REFERENCES public.boutique_commandes(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.boutique_vendors(id) ON DELETE RESTRICT,
  stripe_payment_intent_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0), -- % plateforme
  vendor_amount DECIMAL(10,2) NOT NULL CHECK (vendor_amount >= 0), -- À reverser
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.boutique_paiements ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boutique_paiements_association_id ON public.boutique_paiements(association_id);
CREATE INDEX idx_boutique_paiements_commande_id ON public.boutique_paiements(commande_id);
CREATE INDEX idx_boutique_paiements_status ON public.boutique_paiements(status);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- VENDORS: Accès par association
CREATE POLICY "vendors_select" ON public.boutique_vendors
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "vendors_insert" ON public.boutique_vendors
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "vendors_update" ON public.boutique_vendors
  FOR UPDATE USING (association_id IN (SELECT public.get_user_association_ids()))
  WITH CHECK (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "vendors_delete" ON public.boutique_vendors
  FOR DELETE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- CATEGORIES: Accès par association
CREATE POLICY "categories_select" ON public.boutique_categories
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "categories_insert" ON public.boutique_categories
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "categories_update" ON public.boutique_categories
  FOR UPDATE USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "categories_delete" ON public.boutique_categories
  FOR DELETE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- PRODUITS: Filtre par association
CREATE POLICY "produits_select" ON public.boutique_produits
  FOR SELECT USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "produits_insert" ON public.boutique_produits
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids()) AND
    (public.has_role_in_association(association_id, ARRAY['owner', 'admin']) OR
     public.has_role_in_association(association_id, ARRAY['merchant']))
  );

CREATE POLICY "produits_update" ON public.boutique_produits
  FOR UPDATE USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    (public.has_role_in_association(association_id, ARRAY['owner', 'admin']) OR
     created_by = auth.uid())
  );

CREATE POLICY "produits_delete" ON public.boutique_produits
  FOR DELETE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin']) OR
    created_by = auth.uid()
  );

-- VARIANTES: Hérité du produit
CREATE POLICY "variantes_select" ON public.boutique_produit_variantes
  FOR SELECT USING (
    produit_id IN (SELECT id FROM public.boutique_produits WHERE association_id IN (SELECT public.get_user_association_ids()))
  );

CREATE POLICY "variantes_insert" ON public.boutique_produit_variantes
  FOR INSERT WITH CHECK (
    produit_id IN (SELECT id FROM public.boutique_produits WHERE
      association_id IN (SELECT public.get_user_association_ids()) AND
      (created_by = auth.uid() OR public.has_role_in_association(association_id, ARRAY['owner', 'admin']))
    )
  );

-- PANIER: Utilisateur ne voit que son panier
CREATE POLICY "panier_select" ON public.boutique_panier
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "panier_insert" ON public.boutique_panier
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "panier_update" ON public.boutique_panier
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "panier_delete" ON public.boutique_panier
  FOR DELETE USING (user_id = auth.uid());

-- COMMANDES: User voit ses commandes, admin voit tout
CREATE POLICY "commandes_select" ON public.boutique_commandes
  FOR SELECT USING (
    (user_id = auth.uid() AND association_id IN (SELECT public.get_user_association_ids())) OR
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "commandes_insert" ON public.boutique_commandes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "commandes_update" ON public.boutique_commandes
  FOR UPDATE USING (
    (user_id = auth.uid() AND association_id IN (SELECT public.get_user_association_ids())) OR
    public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'merchant'])
  );

-- COMMANDE_ITEMS: Hérité de la commande
CREATE POLICY "commande_items_select" ON public.boutique_commande_items
  FOR SELECT USING (
    commande_id IN (SELECT id FROM public.boutique_commandes WHERE
      (user_id = auth.uid() AND association_id IN (SELECT public.get_user_association_ids())) OR
      public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
    )
  );

-- PAIEMENTS: Admin/Système seulement
CREATE POLICY "paiements_select" ON public.boutique_paiements
  FOR SELECT USING (
    association_id IN (SELECT public.get_user_association_ids()) AND
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "paiements_insert" ON public.boutique_paiements
  FOR INSERT WITH CHECK (
    association_id IN (SELECT public.get_user_association_ids())
  );

CREATE POLICY "paiements_update" ON public.boutique_paiements
  FOR UPDATE USING (
    public.has_role_in_association(association_id, ARRAY['owner', 'admin'])
  );

-- ============================================================
-- FONCTIONS HELPER (à ajouter au role merchant)
-- ============================================================

-- Met à jour association_members pour ajouter 'merchant' comme rôle possible
-- Cette vérification doit être ajoutée dans le trigger qui valide les rôles
-- Pour l'instant, on laisse les rôles existants: owner, admin, member, viewer
