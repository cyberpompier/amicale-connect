-- ============================================================
-- Amicale Connect - Schéma initial
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extension de auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger pour créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ASSOCIATIONS (tenants)
-- ============================================================
CREATE TABLE public.associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'trialing' NOT NULL
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. ASSOCIATION_MEMBERS (liaison user ↔ association)
-- ============================================================
CREATE TABLE public.association_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, association_id)
);

ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FONCTIONS HELPER RLS
-- ============================================================

-- Retourne les IDs des associations de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_association_ids()
RETURNS SETOF UUID AS $$
  SELECT association_id
  FROM public.association_members
  WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Vérifie si l'utilisateur a un rôle suffisant
CREATE OR REPLACE FUNCTION public.has_role_in_association(
  _association_id UUID,
  _roles TEXT[]
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.association_members
    WHERE user_id = auth.uid()
      AND association_id = _association_id
      AND role = ANY(_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. AMICALISTES (membres sapeurs-pompiers suivis)
-- ============================================================
CREATE TABLE public.amicalistes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  grade TEXT,
  status TEXT DEFAULT 'actif' NOT NULL,
  join_date DATE DEFAULT CURRENT_DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.amicalistes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. COTISATIONS
-- ============================================================
CREATE TABLE public.cotisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  amicaliste_id UUID NOT NULL REFERENCES public.amicalistes(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('paid', 'pending', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(amicaliste_id, year)
);

ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CATEGORIES (comptabilité)
-- ============================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(association_id, name, type)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. TRANSACTIONS (livre de compte)
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. BUREAU_POSITIONS
-- ============================================================
CREATE TABLE public.bureau_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  amicaliste_id UUID NOT NULL REFERENCES public.amicalistes(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.bureau_positions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. EVENEMENTS
-- ============================================================
CREATE TABLE public.evenements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. EVENEMENT_PARTICIPANTS
-- ============================================================
CREATE TABLE public.evenement_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  amicaliste_id UUID NOT NULL REFERENCES public.amicalistes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'invited' NOT NULL
    CHECK (status IN ('invited', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(evenement_id, amicaliste_id)
);

ALTER TABLE public.evenement_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLITIQUES RLS
-- ============================================================

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Associations
CREATE POLICY "Users can view their associations"
  ON public.associations FOR SELECT
  USING (id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "Owners can update their association"
  ON public.associations FOR UPDATE
  USING (public.has_role_in_association(id, ARRAY['owner']));

CREATE POLICY "Authenticated users can create associations"
  ON public.associations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Association Members
CREATE POLICY "Members can view co-members"
  ON public.association_members FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));

CREATE POLICY "Owners/admins can manage members"
  ON public.association_members FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin']));

-- Macro pour les tables liées à une association
-- Amicalistes
CREATE POLICY "View amicalistes" ON public.amicalistes FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage amicalistes" ON public.amicalistes FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member']));

-- Cotisations
CREATE POLICY "View cotisations" ON public.cotisations FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage cotisations" ON public.cotisations FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin']));

-- Categories
CREATE POLICY "View categories" ON public.categories FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage categories" ON public.categories FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin']));

-- Transactions
CREATE POLICY "View transactions" ON public.transactions FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage transactions" ON public.transactions FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin']));

-- Bureau positions
CREATE POLICY "View bureau" ON public.bureau_positions FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage bureau" ON public.bureau_positions FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin']));

-- Evenements
CREATE POLICY "View evenements" ON public.evenements FOR SELECT
  USING (association_id IN (SELECT public.get_user_association_ids()));
CREATE POLICY "Manage evenements" ON public.evenements FOR ALL
  USING (public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member']));

-- Evenement participants
CREATE POLICY "View participants" ON public.evenement_participants FOR SELECT
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE association_id IN (SELECT public.get_user_association_ids())
  ));
CREATE POLICY "Manage participants" ON public.evenement_participants FOR ALL
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member'])
  ));

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_associations_updated_at BEFORE UPDATE ON public.associations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_amicalistes_updated_at BEFORE UPDATE ON public.amicalistes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_evenements_updated_at BEFORE UPDATE ON public.evenements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_association_members_user ON public.association_members(user_id);
CREATE INDEX idx_association_members_assoc ON public.association_members(association_id);
CREATE INDEX idx_amicalistes_assoc ON public.amicalistes(association_id);
CREATE INDEX idx_cotisations_assoc ON public.cotisations(association_id);
CREATE INDEX idx_cotisations_amicaliste ON public.cotisations(amicaliste_id);
CREATE INDEX idx_categories_assoc ON public.categories(association_id);
CREATE INDEX idx_transactions_assoc ON public.transactions(association_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_bureau_positions_assoc ON public.bureau_positions(association_id);
CREATE INDEX idx_evenements_assoc ON public.evenements(association_id);
CREATE INDEX idx_evenements_start_date ON public.evenements(start_date);
CREATE INDEX idx_evenement_participants_event ON public.evenement_participants(evenement_id);
