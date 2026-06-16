# Configuration du Module Donateurs

Le module Donateurs a été ajouté à Amicale Connect sous le menu "Calendriers".

## Installation de la Table Supabase

Puisque l'historique des migrations contient des incohérences, vous devez créer la table manuellement dans la console Supabase.

### Fonctionnement

Les donateurs sont **automatiquement extraits des ventes de calendriers**. Chaque personne qui achète des calendriers devient un donateur avec :
- Ses informations de contact (nom, email, téléphone, adresse)
- Le montant total donné
- Le nombre de dons
- La date du dernier don

### Étapes :

1. **Allez dans la console Supabase** : https://app.supabase.com
2. **Sélectionnez votre projet** : Amicale Connect (lbgzeywajbgxbeaxgfas)
3. **Allez dans l'éditeur SQL** (SQL Editor)
4. **Créez une nouvelle requête** et collez ce SQL :

```sql
-- ============================================================
-- Table Donateurs
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

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_donateurs_association_id ON public.donateurs(association_id);
CREATE INDEX IF NOT EXISTS idx_donateurs_derniere_donation ON public.donateurs(derniere_donation);
CREATE INDEX IF NOT EXISTS idx_donateurs_email ON public.donateurs(email);

-- Activer RLS
ALTER TABLE public.donateurs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Politiques de sécurité RLS
-- ============================================================
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

    -- Créer le donateur
    INSERT INTO public.donateurs (
      association_id,
      prenom,
      nom,
      email,
      telephone,
      adresse,
      total_dons,
      nombre_dons,
      derniere_donation
    ) VALUES (
      v_vente.association_id,
      v_prenom,
      v_nom,
      v_vente.donor_email,
      v_vente.donor_phone,
      v_vente.donor_address,
      v_vente.total,
      v_vente.nombre,
      v_vente.derniere_vente::TIMESTAMPTZ
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger pour mettre à jour les stats des donateurs
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_donateur_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_matching_donateur UUID;
BEGIN
  -- Chercher le donateur par email ou nom
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

-- ============================================================
-- Population initiale des donateurs
-- ============================================================
-- Appel initial pour créer les donateurs existants
SELECT public.sync_donateurs_from_ventes();
```

5. **Cliquez sur "Exécuter"** (Run)
6. Vous verrez le message de succès

## Fichiers Modifiés/Créés

### Navigation
- `src/app/navigation.ts` - Ajout du menu "Donateurs" sous "Calendriers"

### Router
- `src/app/router.tsx` - Ajout de la route `/calendriers/donateurs`

### Hook
- `src/hooks/useDonateurs.ts` - Hook pour gérer les opérations CRUD des donateurs

### Pages et Composants
- `src/features/donateurs/DonatairesPage.tsx` - Page principale listant les donateurs
- `src/features/donateurs/DonateurModal.tsx` - Modal pour ajouter/modifier un donateur

## Fonctionnalités

### Extraction automatique
- Les donateurs sont **créés automatiquement** à partir des ventes de calendriers
- Les statistiques (total, nombre, dernière donation) sont **mises à jour automatiquement** lors de chaque nouvelle vente
- Les informations sont synchronisées avec `calendrier_ventes` (donor_name, donor_email, donor_phone, donor_address)

### Gestion manuelle
- **Ajouter un donateur** avec ses informations de contact (nom, prénom, email, téléphone, adresse)
- **Modifier un donateur** existant
- **Supprimer un donateur**
- **Rechercher** des donateurs par nom, email, téléphone ou ville
- **Voir l'historique** avec le nombre de dons et la date du dernier don
- **Ajouter des notes** spécifiques pour chaque donateur

## Synchronisation des données

### Après création de la table
Exécutez la fonction `sync_donateurs_from_ventes()` pour créer les donateurs existants depuis les ventes passées.

### Automatique ensuite
Un trigger (`trigger_update_donateur_stats`) met à jour automatiquement :
- `total_dons` : somme des montants de toutes les ventes
- `nombre_dons` : nombre total de ventes
- `derniere_donation` : date de la dernière vente

## Utilisation Potentielle

Les informations des donateurs peuvent être utilisées pour :
- **Campagnes de vente ciblées** : identifier les meilleurs donateurs
- **Organisation d'événements** : inviter les donateurs réguliers
- **Mailing/communication** : contacter les supporters
- **Analyse de base de données** : tendances des dons, segments de donateurs
- **Export de données** : rapports, analyses statistiques
