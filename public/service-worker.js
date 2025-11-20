self.addEventListener('install', (event) => {
  console.log('[v0] Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[v0] Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  console.log('[v0] Notification clicked:', event.notification.tag)
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

self.addEventListener('push', (event) => {
  console.log('[v0] Push received:', event)
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body || 'Nueva alerta de inundación',
      icon: '/images/rivex-logo.png',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      data: data.data || {},
      requireInteraction: true,
    }

    event.waitUntil(self.registration.showNotification(data.title || 'Alerta de Inundación', options))
  }
})
