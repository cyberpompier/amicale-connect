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

    console.log('📋 Stripe checkout request received:', { priceId, associationId, userId })
    console.log('🔑 Environment variables check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length,
    })

    if (!priceId || !associationId || !userId) {
      console.error('❌ Missing required fields:', { priceId, associationId, userId })
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields',
          received: { priceId, associationId, userId }
        }),
      }
    }

    // Get the association
    console.log('🔍 Checking Supabase connection...', {
      hasUrl: !!process.env.VITE_SUPABASE_URL,
      hasKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    })

    const { data: association, error: fetchError } = await supabase
      .from('associations')
      .select('id, stripe_customer_id, name, email')
      .eq('id', associationId)
      .single()

    console.log('📦 Association fetch result:', { association, fetchError })

    if (fetchError || !association) {
      console.error('❌ Association not found:', fetchError)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Association not found', details: fetchError?.message }),
      }
    }

    console.log('✅ Association found:', association.id)

    let customerId = association.stripe_customer_id

    // Create or retrieve Stripe customer
    if (!customerId) {
      console.log('🆕 Creating new Stripe customer...')
      const customer = await stripe.customers.create({
        email: association.email || undefined,
        metadata: {
          association_id: associationId,
          association_name: association.name,
        },
      })
      customerId = customer.id
      console.log('✅ Stripe customer created:', customerId)

      // Update association with stripe_customer_id
      const { error: updateError } = await supabase
        .from('associations')
        .update({ stripe_customer_id: customerId })
        .eq('id', associationId)

      if (updateError) {
        console.error('⚠️ Failed to update association with stripe_customer_id:', updateError)
      } else {
        console.log('✅ Association updated with stripe_customer_id')
      }
    } else {
      console.log('♻️ Using existing Stripe customer:', customerId)
    }

    // Create checkout session
    console.log('🛒 Creating Stripe checkout session...', { customerId, priceId })
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

    console.log('✅ Checkout session created:', session.id, 'URL:', session.url)

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionUrl: session.url }),
    }
  } catch (error) {
    console.error('💥 Stripe checkout error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('📍 Error details:', {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Internal server error',
      }),
    }
  }
}

export { handler }
