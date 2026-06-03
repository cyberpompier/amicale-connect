/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

// Precaching Workbox
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigation fallback
registerRoute(
  new NavigationRoute(
    async () => {
      const cache = await caches.open('navigate')
      return (await cache.match('/index.html')) || fetch('/index.html')
    }
  )
)

// Supabase API cache
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [{ cacheKeyWillBeUsed: async ({ request }) => request }],
  }),
  'GET'
)

// ── Push notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; image?: string; url?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() ?? '' }
  }

  const title = data.title || 'Amicale Connect'
  const baseOptions = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  } as NotificationOptions

  const imageUrl = data.image && data.image.startsWith('http') ? data.image : undefined
  const options = imageUrl ? { ...baseOptions, image: imageUrl } as NotificationOptions : baseOptions

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url || '/') as string

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
