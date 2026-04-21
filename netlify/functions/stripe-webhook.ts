import { Handler } from '@netlify/functions'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const signature = event.headers['stripe-signature']
  const body = event.body

  if (!signature || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing signature or body' }),
    }
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    console.log('🔐 Verifying webhook signature...')
    const stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('📨 Webhook event received:', stripeEvent.type)
    console.log('📦 Event data:', {
      type: stripeEvent.type,
      id: stripeEvent.id,
      created: stripeEvent.created,
    })

    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('📝 Handling subscription update...')
        await handleSubscriptionUpdate(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        console.log('🗑️ Handling subscription cancellation...')
        await handleSubscriptionCanceled(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        console.log('✅ Handling payment succeeded...')
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        console.log('❌ Handling payment failed...')
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice)
        break

      default:
        console.log('⏭️ Ignoring event type:', stripeEvent.type)
    }

    console.log('✅ Webhook processed successfully')
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    }
  } catch (error) {
    console.error('💥 Webhook error:', error)
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Webhook error',
      }),
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionStatus = mapStripeStatus(subscription.status)

  console.log('🔍 Looking for association with customer:', customerId)
  console.log('📊 Subscription status:', subscription.status, '→', subscriptionStatus)

  // Get association by stripe_customer_id
  const { data: associations, error: fetchError } = await supabase
    .from('associations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .limit(1)

  if (fetchError) {
    console.error('❌ Error fetching association:', fetchError)
    return
  }

  if (associations && associations.length > 0) {
    const association = associations[0]
    console.log('✅ Association found:', association.id, association.name)

    const { error: updateError } = await supabase
      .from('associations')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', association.id)

    if (updateError) {
      console.error('❌ Error updating association:', updateError)
    } else {
      console.log('✅ Association updated:', {
        id: association.id,
        status: subscriptionStatus,
        subscriptionId: subscription.id,
      })
    }
  } else {
    console.warn('⚠️ No association found for customer:', customerId)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Get association by stripe_customer_id
  const { data: associations } = await supabase
    .from('associations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)

  if (associations && associations.length > 0) {
    const association = associations[0]

    await supabase
      .from('associations')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', association.id)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get association by stripe_customer_id
  const { data: associations } = await supabase
    .from('associations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)

  if (associations && associations.length > 0) {
    const association = associations[0]

    // Update status if it was past_due
    const { data: current } = await supabase
      .from('associations')
      .select('subscription_status')
      .eq('id', association.id)
      .single()

    if (current?.subscription_status === 'past_due') {
      await supabase
        .from('associations')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', association.id)
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get association by stripe_customer_id
  const { data: associations } = await supabase
    .from('associations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)

  if (associations && associations.length > 0) {
    const association = associations[0]

    await supabase
      .from('associations')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('id', association.id)
  }
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'incomplete':
      return 'past_due'
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'canceled'
  }
}

export { handler }
