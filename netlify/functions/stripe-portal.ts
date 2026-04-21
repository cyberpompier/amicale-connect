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

    console.log('🔐 Portal request for association:', associationId)

    if (!associationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing associationId' }),
      }
    }

    // Get the association
    const { data: association, error: fetchError } = await supabase
      .from('associations')
      .select('stripe_customer_id, name')
      .eq('id', associationId)
      .single()

    if (fetchError || !association?.stripe_customer_id) {
      console.error('❌ Association not found:', fetchError)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No Stripe customer found' }),
      }
    }

    console.log('✅ Association found:', association.name)

    // Create portal session
    // Normalize app URL - ensure it has protocol and remove trailing slash
    const rawUrl = (process.env.VITE_APP_URL || '').replace(/\/$/, '')
    const baseUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `https://${rawUrl}`
    const returnUrl = `${baseUrl}/parametres/facturation`

    console.log('🌐 Raw app URL:', rawUrl)
    console.log('🌐 Base URL with protocol:', baseUrl)
    console.log('🌐 Portal return URL:', returnUrl)

    const session = await stripe.billingPortal.sessions.create({
      customer: association.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log('✅ Portal session created:', session.id)
    console.log('🔗 Portal URL:', session.url)

    return {
      statusCode: 200,
      body: JSON.stringify({ portalUrl: session.url }),
    }
  } catch (error) {
    console.error('💥 Stripe portal error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    }
  }
}

export { handler }
