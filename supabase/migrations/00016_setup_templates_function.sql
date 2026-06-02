-- Function to set up templates tables (idempotent)
CREATE OR REPLACE FUNCTION public.setup_templates_tables()
RETURNS TABLE (success boolean, message text) AS $$
DECLARE
  v_success boolean := false;
  v_message text := '';
BEGIN
  BEGIN
    -- Create templates table
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
    v_message := 'Table calendrier_secteurs_templates created or already exists';

    -- Create template rues table
    CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates_rues (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES public.calendrier_secteurs_templates(id) ON DELETE CASCADE,
      name text NOT NULL,
      "order" integer,
      created_at timestamptz DEFAULT now()
    );
    v_message := v_message || '; Table calendrier_secteurs_templates_rues created or already exists';

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_secteurs_templates_association
      ON public.calendrier_secteurs_templates(association_id);

    CREATE INDEX IF NOT EXISTS idx_secteurs_templates_rues_template
      ON public.calendrier_secteurs_templates_rues(template_id);

    v_success := true;
    v_message := v_message || '; Indexes created';

  EXCEPTION WHEN OTHERS THEN
    v_success := false;
    v_message := 'Error: ' || SQLERRM;
  END;

  RETURN QUERY SELECT v_success, v_message;
END;
$$ LANGUAGE plpgsql;

-- Call the function to set up tables
SELECT * FROM public.setup_templates_tables();
