// Service worker de Zuvi: solo muestra los avisos en el móvil (D-24). Los textos no dicen
// nombres ni mensajes, porque se ven en la pantalla bloqueada.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Zuvi";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || "zuvi",
      data: { url: data.url || "/coincidencias" },
      icon: "/favicon.ico",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/coincidencias", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open && "navigate" in open) {
        // navigate() falla si la ventana no está controlada por este service worker: entonces se abre una nueva.
        return open
          .navigate(url)
          .then((w) => (w || open).focus())
          .catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
