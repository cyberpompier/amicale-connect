#!/usr/bin/env node
/**
 * Script pour créer les tables de secteurs templates
 * Exécute: node setup-templates-tables.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lbgzeywajbgxbeaxgfas.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ3pleXdhamJneGJlYXhnZmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI5NDEwNSwiZXhwIjoyMDkxODcwMTA1fQ.s9bKtbRYs8kBJQUjXJiScCJT4h50brvt6SYBP8_pB20';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  objective_amount numeric DEFAULT 0,
  objective_calendriers integer DEFAULT 0,
  color text DEFAULT '#3B82F6',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(association_id, name)
);

CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates_rues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.calendrier_secteurs_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secteurs_templates_association
  ON public.calendrier_secteurs_templates(association_id);

CREATE INDEX IF NOT EXISTS idx_secteurs_templates_rues_template
  ON public.calendrier_secteurs_templates_rues(template_id);
`;

(async () => {
  try {
    console.log('✅ Création des tables calendrier_secteurs_templates...');

    // Note: Supabase JS client n'exécute pas du SQL DDL directement
    // Vous devez exécuter le SQL manuellement dans Supabase Studio
    console.log('\n⚠️  Les tables ne peuvent pas être créées via le SDK Supabase JS');
    console.log('\n📋 Instructions manuelles:');
    console.log('1. Allez à: https://app.supabase.com/project/lbgzeywajbgxbeaxgfas/sql/new');
    console.log('2. Copie-colle le SQL ci-dessous:');
    console.log('\n' + sql);
    console.log('\n3. Clique sur "RUN"');
    console.log('\n✅ Ensuite les tables seront créées et le système de templates sera prêt!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
