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
    const stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice)
        break
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    }
  } catch (error) {
    console.error('Webhook error:', error)
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
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', association.id)
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
