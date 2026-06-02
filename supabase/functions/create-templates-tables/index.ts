import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // Exécuter le SQL pour créer les tables
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
    `

    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, message: 'Tables créées avec succès' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
