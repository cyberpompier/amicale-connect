-- Final migration for templates tables (migration 00020)
-- This migration creates the templates tables with full idempotency
-- All previous migrations are assumed to already exist in the database

-- Create templates table if it doesn't exist
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

-- Create template rues table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates_rues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.calendrier_secteurs_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_secteurs_templates_association
  ON public.calendrier_secteurs_templates(association_id);

CREATE INDEX IF NOT EXISTS idx_secteurs_templates_rues_template
  ON public.calendrier_secteurs_templates_rues(template_id);
