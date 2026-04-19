import { Handler } from '@netlify/functions'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { associationId } = JSON.parse(event.body || '{}')

    if (!associationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing associationId' }),
      }
    }

    // Get the association
    const { data: association, error: fetchError } = await supabase
      .from('associations')
      .select('stripe_customer_id')
      .eq('id', associationId)
      .single()

    if (fetchError || !association?.stripe_customer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No Stripe customer found' }),
      }
    }

    // Create portal session
    // Normalize app URL - remove trailing slash if present
    const baseUrl = (process.env.VITE_APP_URL || '').replace(/\/$/, '')

    const session = await stripe.billingPortal.sessions.create({
      customer: association.stripe_customer_id,
      return_url: `${baseUrl}/parametres/facturation`,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ portalUrl: session.url }),
    }
  } catch (error) {
    console.error('Stripe portal error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    }
  }
}

export { handler }
