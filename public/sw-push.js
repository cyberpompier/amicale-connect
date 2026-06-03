self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { data = { title: event.data?.text() ?? '' } }
  const title = data.title || 'Amicale Connect'
  const baseOptions = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url ? { url: data.url } : {},
    vibrate: [100, 50, 100],
  }
  const imageUrl = data.image && data.image.startsWith('http') ? data.image : undefined
  event.waitUntil(self.registration.showNotification(title,
    imageUrl ? { ...baseOptions, image: imageUrl } : baseOptions
  ))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
