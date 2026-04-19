# Stripe Integration Setup Guide

This document outlines the steps needed to set up Stripe payment processing for Amicale Connect.

## Overview

The Stripe integration consists of:
- **Netlify Functions** for handling Stripe API calls
- **Supabase database** for storing subscription information
- **React frontend** for user interactions with the billing system

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Netlify account with the project deployed
3. Supabase project configured

## Step 1: Create Stripe Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Create**
3. Create three products:

### Product 1: Essentiel Plan
- Name: `Essentiel`
- Description: `Pour les amicales actives`
- Price: €9.00/month (recurring, monthly)
- Save the Price ID (looks like `price_...`)

### Product 2: Premium Plan
- Name: `Premium`
- Description: `Toutes les fonctionnalités`
- Price: €19.00/month (recurring, monthly)
- Save the Price ID

### Note on Free Plan
- The free plan doesn't require a Stripe product
- It's the default plan for new associations

## Step 2: Get Stripe API Keys

1. Go to **Settings** → **API Keys**
2. Copy your **Secret Key** (starts with `sk_live_` or `sk_test_`)
3. Copy your **Publishable Key** (starts with `pk_live_` or `pk_test_`)
4. Keep these safe - never commit them to version control!

## Step 3: Set Up Webhook

1. Go to **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Endpoint URL: `https://your-netlify-domain.com/.netlify/functions/stripe-webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_`)

## Step 4: Configure Environment Variables

Set these environment variables in your Netlify project:

### In Netlify Dashboard (Settings → Build & Deploy → Environment)

```
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PRICE_ESSENTIEL=price_your_essentiel_id
VITE_STRIPE_PRICE_PREMIUM=price_your_premium_id
VITE_APP_URL=https://your-app-domain.com
```

### Also set in `.env` for local development:

```
VITE_STRIPE_PRICE_ESSENTIEL=price_test_essentiel
VITE_STRIPE_PRICE_PREMIUM=price_test_premium
VITE_APP_URL=http://localhost:5173
```

Note: Never commit the secret keys to git. Keep them in Netlify's secure environment variables.

## Step 5: Test the Integration

1. Use Stripe's test mode (use `4242 4242 4242 4242` as test card)
2. Navigate to **Paramètres** → **Facturation**
3. Click "Choisir Essentiel" or "Choisir Premium"
4. Complete the checkout with test card
5. Verify that:
   - Stripe customer is created
   - Subscription is created
   - Webhook updates the association status in Supabase

## Step 6: Go Live with Stripe

1. Complete Stripe account verification
2. Switch from test keys to live keys in environment variables
3. Update webhook endpoint to production URL
4. Test one live transaction (you can refund it)
5. Monitor webhooks for any issues

## Subscription Statuses

The system tracks these subscription statuses:

- `free` - Default for new associations, no Stripe subscription
- `trialing` - Trial period active (if configured in Stripe)
- `active` - Active paid subscription
- `past_due` - Payment failed, subscription at risk
- `canceled` - Subscription canceled by user or system

## Troubleshooting

### Webhook Events Not Received

1. Check webhook signing secret in `.env`
2. Verify endpoint URL is correct in Stripe dashboard
3. Check Netlify function logs for errors
4. Use Stripe webhook test tool to verify endpoint

### Subscription Status Not Updating

1. Check that `stripe_customer_id` is set in associations table
2. Verify webhook handler function is running
3. Check Supabase RLS policies allow updates
4. Review Supabase activity logs for errors

### Checkout Session Creation Fails

1. Verify price IDs are correct in environment variables
2. Check that Stripe secret key is configured
3. Ensure association exists in database
4. Check Netlify function logs for detailed errors

## Monitoring

Monitor these areas regularly:

1. **Stripe Dashboard** - Check failed payments, disputes
2. **Netlify Functions** - Review logs for errors
3. **Supabase** - Monitor subscription_status updates
4. **Email** - Set up Stripe email notifications

## References

- [Stripe Documentation](https://stripe.com/docs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Supabase Documentation](https://supabase.com/docs)
