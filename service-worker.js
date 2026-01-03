// ==========================
// NARZĘDZIOWNIK – SERVICE WORKER (v3)
// ==========================

const CACHE_NAME = "narzedziownik-cache-v3";
const URLS_TO_CACHE = [
  "index.html",
  "style.css",
  "app.js",
  "db.js",
  "manifest.json",
  "tools.csv",
  "https://cdn.jsdelivr.net/npm/dexie@3.2.3/dist/dexie.min.js"
];

// --- Instalacja i caching zasobów ---
self.addEventListener("install", event => {
  console.log("🛠️ Instalacja Service Workera...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of URLS_TO_CACHE) {
        try {
          await cache.add(url);
          console.log("✅ Zapisano w cache:", url);
        } catch (err) {
          console.warn("⚠️ Nie udało się zcacheować:", url, err);
        }
      }
    })
  );
});

// --- Tryb OFFLINE-FIRST ---
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // jeśli jest w cache – zwróć z cache
      if (response) {
        return response;
      }
      // jeśli nie – pobierz z sieci i zapisz do cache
      return fetch(event.request)
        .then(fetchResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            // pomijamy żądania z zewnętrznych domen
            if (event.request.url.startsWith(self.location.origin)) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        })
        .catch(() => {
          // fallback – jeśli jesteśmy offline, a nie ma pliku
          if (event.request.destination === "document") {
            return caches.match("index.html");
          }
        });
    })
  );
});

// --- Aktualizacja cache po nowej wersji ---
self.addEventListener("activate", event => {
  console.log("♻️ Aktywacja nowej wersji Service Workera...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("🧹 Usuwanie starego cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
});
