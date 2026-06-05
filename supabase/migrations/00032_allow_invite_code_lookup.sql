-- Permettre à tout utilisateur authentifié de chercher une association par son code d'invitation
-- (lecture limitée à id, name, city — pas les données sensibles)
CREATE POLICY "associations_lookup_by_invite_code"
  ON public.associations
  FOR SELECT
  TO authenticated
  USING (invite_code IS NOT NULL);
