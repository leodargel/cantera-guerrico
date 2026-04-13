/**
 * Service Worker — Cantera Guerrico PWA
 * Cachea todos los assets para funcionar offline
 */

const CACHE_NAME = 'guerrico-v8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/appState.js',
  './js/utils.js',
  './js/dataSync.js',
  './js/uiUpdates.js',
  './js/charts.js',
  './js/reports.js',
  './js/forms.js',
  './js/blasting.js',
  './js/wear.js',
  './js/fleet.js',
  './js/assets.js',
  './js/production.js',
  './js/inventory.js',
  './js/maintenance.js',
  './js/scales.js',
  './js/live.js',
  './js/analytics.js',
  './js/ai.js',
  './js/ai_analysis.js',
  './js/main.js',
  // CDN libs — también cacheadas
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter+Tight:wght@300;400;500;600;700;800&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Instalar: cachear todos los assets locales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Solo cachear assets locales en install (los CDN pueden fallar offline)
      const localAssets = ASSETS_TO_CACHE.filter(url => !url.startsWith('http'));
      return cache.addAll(localAssets).catch(err => {
        console.warn('[SW] Algunos assets no se pudieron cachear:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache First para assets locales, Network First para API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls: siempre red (no cachear respuestas de IA/Gemini)
  if (url.hostname.includes('anthropic') || url.hostname.includes('googleapis') || url.hostname.includes('generativelanguage')) {
    return; // dejar pasar sin interceptar
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cachear respuestas exitosas de assets locales y CDN
        if (response && response.status === 200 && (url.origin === self.location.origin || url.hostname.includes('cdn') || url.hostname.includes('unpkg') || url.hostname.includes('fonts.googleapis'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin red: para HTML devolver index.html cacheado
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Mensaje para forzar update desde la app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
