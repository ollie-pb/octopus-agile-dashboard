// Service Worker for Octopus Agile Dashboard
// Provides offline functionality and caching

const CACHE_NAME = 'octopus-agile-v1.0.0';
const STATIC_CACHE_NAME = 'octopus-agile-static-v1.0.0';
const API_CACHE_NAME = 'octopus-agile-api-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/api.js',
  '/js/dataProcessor.js',
  '/js/storage.js',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  'api.octopus.energy'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      // Cache API responses
      caches.open(API_CACHE_NAME)
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName.startsWith('octopus-agile-')) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Check if request is for a static asset
function isStaticAsset(url) {
  return url.origin === self.location.origin && 
         (url.pathname.includes('/css/') || 
          url.pathname.includes('/js/') || 
          url.pathname.includes('/assets/') ||
          url.pathname === '/manifest.json');
}

// Check if request is for API data
function isAPIRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.hostname.includes(endpoint));
}

// Check if request is a navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Handle static asset requests (cache first)
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static asset fetch failed', error);
    throw error;
  }
}

// Handle API requests (network first, cache fallback)
async function handleAPIRequest(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error(`API request failed: ${networkResponse.status}`);
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error.message);
    
    // Fall back to cache
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add custom header to indicate cached response
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'ServiceWorker');
      return response;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'No cached data available',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'ServiceWorker'
        }
      }
    );
  }
}

// Handle navigation requests (cache first, network fallback)
async function handleNavigationRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match('/index.html');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not cached, try network
    const networkResponse = await fetch('/index.html');
    if (networkResponse.ok) {
      cache.put('/index.html', networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Navigation request failed', error);
    
    // Return basic offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Offline - Agile Pricing</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 2rem; 
            background: #FFFBEB;
            color: #374151;
          }
          .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
          .offline-title { font-size: 1.5rem; margin-bottom: 1rem; color: #2D5A27; }
          .offline-message { margin-bottom: 2rem; }
          .retry-btn { 
            background: #2D5A27; 
            color: white; 
            padding: 0.75rem 1.5rem; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 1rem;
          }
          .retry-btn:hover { background: #87A96B; }
        </style>
      </head>
      <body>
        <div class="offline-icon">🌱</div>
        <h1 class="offline-title">You're Offline</h1>
        <p class="offline-message">
          Please check your internet connection and try again.
        </p>
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-Served-By': 'ServiceWorker'
        }
      }
    );
  }
}

// Handle background sync (future feature)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-pricing') {
    event.waitUntil(syncPricingData());
  }
});

// Sync pricing data in background
async function syncPricingData() {
  try {
    console.log('Service Worker: Syncing pricing data...');
    
    // This would fetch fresh pricing data and update the cache
    // Implementation would depend on the app's data management strategy
    
    // For now, just log the attempt
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Handle push notifications (future feature)
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Electricity pricing update available',
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data,
      actions: [
        {
          action: 'view',
          title: 'View Prices',
          icon: '/assets/icons/shortcut-current.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Agile Pricing Update', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?notification=true')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (future feature)
self.addEventListener('periodicsync', event => {
  console.log('Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'pricing-update') {
    event.waitUntil(syncPricingData());
  }
});

console.log('Service Worker: Script loaded', CACHE_NAME);