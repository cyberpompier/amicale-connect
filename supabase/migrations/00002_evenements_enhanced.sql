-- ============================================================
-- Amicale Connect — Événements enrichis
-- Migration 00002
-- ============================================================

-- Étendre la table evenement_participants
ALTER TABLE public.evenement_participants
  ADD COLUMN IF NOT EXISTS paiement TEXT DEFAULT 'en_attente'
    CHECK (paiement IN ('en_attente', 'paye', 'exonere')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS nombre_accompagnants INTEGER DEFAULT 0;

-- ============================================================
-- INVITÉS EXTERNES (non-membres)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evenement_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  statut TEXT DEFAULT 'invite'
    CHECK (statut IN ('invite', 'confirme', 'decline')),
  paiement TEXT DEFAULT 'en_attente'
    CHECK (paiement IN ('en_attente', 'paye', 'exonere')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.evenement_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View evenement_invites" ON public.evenement_invites FOR SELECT
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE association_id IN (SELECT public.get_user_association_ids())
  ));

CREATE POLICY "Manage evenement_invites" ON public.evenement_invites FOR ALL
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member'])
  ));

-- ============================================================
-- COMMENTAIRES & NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evenement_commentaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  auteur TEXT NOT NULL,
  contenu TEXT NOT NULL,
  note INTEGER CHECK (note BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.evenement_commentaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View evenement_commentaires" ON public.evenement_commentaires FOR SELECT
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE association_id IN (SELECT public.get_user_association_ids())
  ));

CREATE POLICY "Manage evenement_commentaires" ON public.evenement_commentaires FOR ALL
  USING (evenement_id IN (
    SELECT id FROM public.evenements
    WHERE public.has_role_in_association(association_id, ARRAY['owner', 'admin', 'member'])
  ));

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_evenement_invites_event ON public.evenement_invites(evenement_id);
CREATE INDEX IF NOT EXISTS idx_evenement_commentaires_event ON public.evenement_commentaires(evenement_id);
