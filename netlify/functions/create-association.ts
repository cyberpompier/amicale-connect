import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface CreateAssociationRequest {
  name: string
  city?: string
  address?: string
  phone?: string
  email?: string
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.slice(7)

    // Get user from token (using Supabase JWT verification)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: CreateAssociationRequest = await req.json()

    if (!body.name?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Association name is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create association (as service role, bypassing RLS)
    const { data: assoc, error: assocError } = await supabase
      .from('associations')
      .insert({
        name: body.name.trim(),
        city: body.city?.trim() || null,
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        subscription_status: 'trialing',
      })
      .select('id, name, subscription_status')
      .single()

    if (assocError) {
      console.error('❌ Association creation error:', assocError)
      return new Response(
        JSON.stringify({ error: 'Failed to create association', details: assocError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Link user as owner
    const { error: memberError } = await supabase
      .from('association_members')
      .insert({
        user_id: user.id,
        association_id: assoc.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('❌ Member link error:', memberError)
      // Don't fail - the association was created, just the link failed
      // (This shouldn't happen but let's be safe)
      return new Response(
        JSON.stringify({
          error: 'Association created but failed to link user',
          details: memberError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Association created:', assoc.id, 'for user:', user.id)

    return new Response(JSON.stringify({ association: assoc }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('💥 Function error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: 'Server error', details: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
