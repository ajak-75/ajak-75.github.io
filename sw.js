/* Ajak Studio — sw.js
   셸(HTML·CSS·JS·아이콘)을 캐시해 두고, 문서는 네트워크 우선(실패 시 캐시)으로 연다.
   번역 API 같은 외부 요청은 건드리지 않는다. */
const VER = 'ajak-studio-v32';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './apps.js',
  './i18n.js',
  './manifest.webmanifest',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './apps/ajak.png?v=3',
  './apps/komi-diary.png',
  './apps/komi-pop.png?v=4',
  './apps/komi-pop-512.png?v=4',
  './apps/k-sajoo.png?v=2',
  './apps/k-sajoo-512.png?v=2',
  './apps/abi.png?v=1',
  './apps/abi-512.png?v=1',
  './apps/bubble-merge.png?v=1',
  './apps/bubble-merge-512.png?v=1',
  './apps/momo-run.png?v=1',
  './apps/momo-run-512.png?v=1'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VER)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* 번역 API 등 외부 요청은 그대로 통과 */

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(VER).then((c) => c.put(req, res)).catch(() => {});
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
