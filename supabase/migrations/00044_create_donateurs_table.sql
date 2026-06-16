-- ============================================================
-- Migration: Table Donateurs
-- ============================================================
-- Table pour gérer les donateurs de l'amicale
-- Permet de suivre les informations de contact et l'historique des dons
-- Données extraites depuis les ventes de calendriers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.donateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  total_dons DECIMAL(10,2) DEFAULT 0 NOT NULL,
  nombre_dons INTEGER DEFAULT 0 NOT NULL,
  derniere_donation TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donateurs_association_id ON public.donateurs(association_id);
CREATE INDEX IF NOT EXISTS idx_donateurs_derniere_donation ON public.donateurs(derniere_donation);
CREATE INDEX IF NOT EXISTS idx_donateurs_email ON public.donateurs(email);

ALTER TABLE public.donateurs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "donateurs_select" ON public.donateurs;
DROP POLICY IF EXISTS "donateurs_insert" ON public.donateurs;
DROP POLICY IF EXISTS "donateurs_update" ON public.donateurs;
DROP POLICY IF EXISTS "donateurs_delete" ON public.donateurs;

-- RLS Policies - accès si membre ou admin de l'association
CREATE POLICY "donateurs_select" ON public.donateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.association_members
      WHERE association_id = donateurs.association_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "donateurs_insert" ON public.donateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.association_members
      WHERE association_id = association_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "donateurs_update" ON public.donateurs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.association_members
      WHERE association_id = donateurs.association_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.association_members
      WHERE association_id = donateurs.association_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "donateurs_delete" ON public.donateurs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.association_members
      WHERE association_id = donateurs.association_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================
-- Fonction pour extraire les donateurs depuis les ventes
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_donateurs_from_ventes()
RETURNS void AS $$
DECLARE
  v_vente RECORD;
  v_donateur_id UUID;
  v_prenom TEXT;
  v_nom TEXT;
  v_adresse TEXT;
  v_ville TEXT;
BEGIN
  FOR v_vente IN
    SELECT DISTINCT
      cv.association_id,
      cv.donor_name,
      cv.donor_email,
      cv.donor_phone,
      cv.donor_address,
      SUM(cv.amount) as total,
      COUNT(*) as nombre,
      MAX(cv.sale_date) as derniere_vente
    FROM public.calendrier_ventes cv
    WHERE cv.donor_name IS NOT NULL
    GROUP BY cv.association_id, cv.donor_name, cv.donor_email, cv.donor_phone, cv.donor_address
  LOOP
    -- Parser le nom en prénom et nom
    v_prenom := SPLIT_PART(v_vente.donor_name, ' ', 1);
    v_nom := SUBSTRING(v_vente.donor_name, LENGTH(v_prenom) + 2);

    IF v_nom IS NULL OR v_nom = '' THEN
      v_nom := v_prenom;
      v_prenom := '';
    END IF;

    -- Séparer adresse (numéro, rue) et ville (dernière partie après la virgule)
    IF v_vente.donor_address LIKE '%,%' THEN
      v_ville := TRIM(SUBSTRING(v_vente.donor_address FROM '[^,]+$'));
      v_adresse := TRIM(SUBSTRING(v_vente.donor_address FROM '^(.*),[^,]+$'));
    ELSE
      v_adresse := v_vente.donor_address;
      v_ville := NULL;
    END IF;

    -- Chercher ou créer le donateur
    INSERT INTO public.donateurs (
      association_id,
      prenom,
      nom,
      email,
      telephone,
      adresse,
      ville,
      total_dons,
      nombre_dons,
      derniere_donation
    ) VALUES (
      v_vente.association_id,
      v_prenom,
      v_nom,
      v_vente.donor_email,
      v_vente.donor_phone,
      v_adresse,
      v_ville,
      v_vente.total,
      v_vente.nombre,
      v_vente.derniere_vente::TIMESTAMPTZ
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger pour mettre à jour automatiquement les stats des donateurs
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_donateur_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_matching_donateur UUID;
BEGIN
  -- Chercher le donateur correspondant par nom et email
  SELECT id INTO v_matching_donateur
  FROM public.donateurs
  WHERE association_id = NEW.association_id
    AND (
      (email = NEW.donor_email AND email IS NOT NULL)
      OR (nom ILIKE NEW.donor_name AND nom IS NOT NULL)
    )
  LIMIT 1;

  -- Si trouvé, mettre à jour ses stats
  IF v_matching_donateur IS NOT NULL THEN
    UPDATE public.donateurs
    SET
      total_dons = COALESCE(
        (SELECT SUM(amount) FROM public.calendrier_ventes
         WHERE association_id = NEW.association_id
         AND (donor_email = NEW.donor_email OR donor_name ILIKE nom)
         AND donor_email IS NOT NULL),
        0
      ),
      nombre_dons = COALESCE(
        (SELECT COUNT(*) FROM public.calendrier_ventes
         WHERE association_id = NEW.association_id
         AND (donor_email = NEW.donor_email OR donor_name ILIKE nom)
         AND donor_email IS NOT NULL),
        0
      ),
      derniere_donation = (
        SELECT MAX(sale_date)::TIMESTAMPTZ FROM public.calendrier_ventes
        WHERE association_id = NEW.association_id
        AND (donor_email = NEW.donor_email OR donor_name ILIKE nom)
        AND donor_email IS NOT NULL
      ),
      updated_at = now()
    WHERE id = v_matching_donateur;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_donateur_stats
AFTER INSERT OR UPDATE ON public.calendrier_ventes
FOR EACH ROW
EXECUTE FUNCTION public.update_donateur_stats();
