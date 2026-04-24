// sw.js

const CACHE_NAME = "monea-v1";
const ASSETS = [
  "/",
  "/terminal.html",
  "/CSS/styles.css",
  "/JS/terminal.js",
  "/IMAGES/Logo2.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const options = {
    body: data.body || "Nova notificação",
    icon: "/IMAGES/Logo2.png",
    badge: "/IMAGES/Logo2.png",
    vibrate: [200, 100, 200], // Faz o celular vibrar
    data: { url: data.url },
    actions: [{ action: "open", title: "Ver no Terminal" }],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Monea Terminal", options),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/terminal.html";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if (client.url.includes("/terminal.html") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
