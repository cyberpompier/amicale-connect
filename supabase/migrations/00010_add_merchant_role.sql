-- ============================================================
-- Migration: Ajouter le rôle 'merchant' pour la boutique
-- ============================================================

-- Supprimer l'ancienne contrainte CHECK sur le rôle
ALTER TABLE public.association_members
  DROP CONSTRAINT IF EXISTS association_members_role_check;

-- Recréer avec 'merchant' en plus
ALTER TABLE public.association_members
  ADD CONSTRAINT association_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'merchant'));

COMMENT ON COLUMN public.association_members.role IS
  'Rôles disponibles: owner, admin, member, viewer, merchant (gestion boutique)';
