import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Workbox precaching (auto-injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// Runtime caching for Supabase API calls
registerRoute(
  ({ url }) => url.pathname.includes('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 300,
      }),
    ],
    networkTimeoutSeconds: 5,
  })
)

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Reminder', body: event.data?.text() || '' }
  }

  const title = data.title || 'Reminder'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || `reminder-${Date.now()}`,
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data?.url || '/')
    })
  )
})
