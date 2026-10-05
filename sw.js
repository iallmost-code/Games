// Minimal service worker so phones offer "Install app" / "Add to Home screen".
// It caches nothing: every request goes straight to the network, so players always get the latest build.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => event.respondWith(fetch(event.request)));
