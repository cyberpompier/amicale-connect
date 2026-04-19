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
    const { priceId, associationId, userId } = JSON.parse(event.body || '{}')

    if (!priceId || !associationId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      }
    }

    // Get the association
    const { data: association, error: fetchError } = await supabase
      .from('associations')
      .select('id, stripe_customer_id, name, email')
      .eq('id', associationId)
      .single()

    if (fetchError || !association) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Association not found' }),
      }
    }

    let customerId = association.stripe_customer_id

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: association.email || undefined,
        metadata: {
          association_id: associationId,
          association_name: association.name,
        },
      })
      customerId = customer.id

      // Update association with stripe_customer_id
      await supabase
        .from('associations')
        .update({ stripe_customer_id: customerId })
        .eq('id', associationId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL}/parametres/facturation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL}/parametres/facturation`,
      metadata: {
        association_id: associationId,
        user_id: userId,
      },
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionUrl: session.url }),
    }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    }
  }
}

export { handler }
