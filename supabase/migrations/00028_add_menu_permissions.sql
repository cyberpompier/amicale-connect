-- Table de configuration des accès aux menus par profil
CREATE TABLE IF NOT EXISTS public.menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  role TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (association_id, menu_key, role)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_menu_permissions_association ON public.menu_permissions(association_id);

-- RLS
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre de l'association
CREATE POLICY "menu_permissions_select" ON public.menu_permissions
  FOR SELECT USING (
    association_id IN (
      SELECT association_id FROM public.association_members WHERE user_id = auth.uid()
    )
  );

-- Écriture : admin et owner uniquement
CREATE POLICY "menu_permissions_insert" ON public.menu_permissions
  FOR INSERT WITH CHECK (
    association_id IN (
      SELECT association_id FROM public.association_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "menu_permissions_update" ON public.menu_permissions
  FOR UPDATE USING (
    association_id IN (
      SELECT association_id FROM public.association_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "menu_permissions_delete" ON public.menu_permissions
  FOR DELETE USING (
    association_id IN (
      SELECT association_id FROM public.association_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.menu_permissions IS 'Configuration des accès aux menus par profil utilisateur pour chaque association';
COMMENT ON COLUMN public.menu_permissions.menu_key IS 'Clé du menu (ex: calendriers, membres, comptabilite)';
COMMENT ON COLUMN public.menu_permissions.role IS 'Profil utilisateur (admin, bureau, tresorier, membre)';
