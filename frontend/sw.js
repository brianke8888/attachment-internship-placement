const CACHE_NAME = 'placementhub-v1'
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/landing.html',
  '/offline.html',
  '/css/style.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/index.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip API calls and socket.io
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Return cached version or offline page for navigation requests
        if (cached) return cached
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html')
        }
        return new Response('', { status: 503, statusText: 'Offline' })
      })

      return cached || fetched
    })
  )
})
