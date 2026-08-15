/*
 * Service worker פשוט — מאפשר לפתוח את היומן גם בלי אינטרנט,
 * ובאייפון הוא חלק ממה שהופך את האפליקציה ל"אמיתית" אחרי הוספה למסך הבית.
 * אסטרטגיה: מגישים מהמטמון מיד, ומעדכנים אותו ברקע.
 */

const CACHE = 'baby-journal-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // רק קבצים של האפליקציה עצמה — לא נוגעים בגופנים או בבקשות חיצוניות
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fromNetwork = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fromNetwork;
    }),
  );
});
