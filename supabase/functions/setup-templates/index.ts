import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Exécuter les CREATE TABLE statements
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates (
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
      )`
    })

    if (e1) throw e1

    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.calendrier_secteurs_templates_rues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id uuid NOT NULL REFERENCES public.calendrier_secteurs_templates(id) ON DELETE CASCADE,
        name text NOT NULL,
        "order" integer,
        created_at timestamptz DEFAULT now()
      )`
    })

    if (e2) throw e2

    const { error: e3 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_secteurs_templates_association ON public.calendrier_secteurs_templates(association_id)`
    })

    if (e3) throw e3

    const { error: e4 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_secteurs_templates_rues_template ON public.calendrier_secteurs_templates_rues(template_id)`
    })

    if (e4) throw e4

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tables de templates créées avec succès!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('Erreur:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
