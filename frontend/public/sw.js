// Service worker mínimo — só existe pra satisfazer o critério de instalação
// de PWA (Chrome/Android exige um fetch handler registrado). Sem cache
// agressivo de propósito: o app é dinâmico (sessões, relógio mundial, etc.),
// cache de verdade entra depois se for necessário.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Só intercepta same-origin para evitar bug do WebKit/Safari com
  // respostas opacas de requisições cross-origin refeitas via SW.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});
