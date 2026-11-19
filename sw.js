// Service worker: samo obavijesti (podsjetnici). Ništa ne sprema u predmemoriju i ne
// presreće zahtjeve, pa aplikacija radi i učitava se kao i bez njega.

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (ev) { ev.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (ev) {
  var d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch (e) { d = { title: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil(self.registration.showNotification(d.title || 'Tanjurić', {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    lang: d.lang || undefined,
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', function (ev) {
  ev.notification.close();
  var url = new URL((ev.notification.data && ev.notification.data.url) || '/', self.location.origin).href;
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    var win = list.filter(function (c) { return new URL(c.url).origin === self.location.origin; })[0];
    if (win) {
      // otvorena aplikacija sama prebaci na dijete i karticu Terapije
      win.postMessage({ type: 'open', url: url });
      return win.focus();
    }
    return self.clients.openWindow(url);
  }));
});
