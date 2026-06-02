-- RPC function to create templates tables (can be called via API)
-- Usage: curl -X POST https://lbgzeywajbgxbeaxgfas.supabase.co/rest/v1/rpc/setup_templates_tables \
--   -H "Authorization: Bearer SERVICE_KEY" \
--   -H "Content-Type: application/json"

CREATE OR REPLACE FUNCTION public.setup_templates_tables()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- Create calendrier_secteurs_templates table
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

  -- Create calendrier_secteurs_templates_rues table
  CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates_rues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES public.calendrier_secteurs_templates(id) ON DELETE CASCADE,
    name text NOT NULL,
    "order" integer,
    created_at timestamptz DEFAULT now()
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_secteurs_templates_association
    ON public.calendrier_secteurs_templates(association_id);

  CREATE INDEX IF NOT EXISTS idx_secteurs_templates_rues_template
    ON public.calendrier_secteurs_templates_rues(template_id);

  v_result := json_build_object(
    'success', true,
    'message', 'Tables calendrier_secteurs_templates created successfully'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Call the function immediately
SELECT public.setup_templates_tables();
