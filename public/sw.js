// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpa caches antigos se necessário
});

self.addEventListener('fetch', (event) => {
  // Estratégia simples: Apenas responde com a rede (Network Only)
  // Para um PWA offline real, você precisaria de cache aqui.
  event.respondWith(fetch(event.request));
});