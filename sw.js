// sw.js

const CACHE_NAME = "monea-v2";
const ASSETS = [
  "./",
  "./terminal.html",
  "./CSS/styles.css",
  "./JS/terminal.js",
  "./IMAGES/Logo2.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // 🔥 ativa imediatamente

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // 🔥 limpa versões antigas
          }
        }),
      ),
    ),
  );

  self.clients.claim(); // 🔥 assume controle imediato
});

self.addEventListener("fetch", (event) => {
  // 🚨 NÃO INTERCEPTAR POST (Supabase, API, etc)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();

            caches.open("monea-dynamic").then((cache) => {
              cache.put(event.request, clone);
            });

            return response;
          })
          .catch(() => caches.match("./terminal.html"))
      );
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "Monea Terminal";

  const options = {
    body: data.body || "Nova notificação",
    icon: "./IMAGES/Logo2.png",
    badge: "./IMAGES/Logo2.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "./terminal.html",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "./terminal.html";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("terminal.html") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
