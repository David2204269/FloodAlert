export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[v0] Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    })
    console.log('[v0] Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('[v0] Service Worker registration failed:', error)
    return null
  }
}
