// sw.js

const CACHE_NAME = "monea-v1";
const ASSETS = [
  "./",
  "./terminal.html",
  "./CSS/styles.css",
  "./JS/terminal.js",
  "./IMAGES/Logo2.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        return response || caches.match("./terminal.html");
      });
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
