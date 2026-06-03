import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:contact@amicale-connect.fr'

interface PushPayload {
  association_id?: string
  user_id?: string
  title: string
  body: string
  url?: string
}

async function signVapid(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const unsignedToken = `${encode(header)}.${encode(payload)}`

  const keyData = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  )
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${unsignedToken}.${sig}`
}

async function sendToSubscription(sub: { endpoint: string; p256dh: string; auth: string }, payload: PushPayload) {
  const url = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await signVapid(audience)

  const body = JSON.stringify(payload)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      TTL: '86400',
    },
    body,
  })

  return res.status
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body: PushPayload = await req.json()

  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (body.association_id) query = query.eq('association_id', body.association_id)
  if (body.user_id) query = query.eq('user_id', body.user_id)

  const { data: subs, error } = await query
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const results = await Promise.allSettled(
    (subs ?? []).map((sub) => sendToSubscription(sub, body))
  )

  const expired = results
    .map((r, i) => ({ r, endpoint: subs![i].endpoint }))
    .filter(({ r }) => r.status === 'fulfilled' && (r.value === 410 || r.value === 404))
    .map(({ endpoint }) => endpoint)

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return new Response(JSON.stringify({ sent: results.length, expired: expired.length }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
