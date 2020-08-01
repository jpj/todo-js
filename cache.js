self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open("v1").then(function (cache) {
      return cache.addAll([
        "/index.html",
        "/cache.js",
        "/about.html"
      ]);
    })
      .catch(e => console.log(e))
  );
});

self.addEventListener("fetch", function (event) {
  console.log("Fetch Event");

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response !== undefined) {
        return response;
      }

      return fetch(event.request).then(function (response) {
        const responseClone = response.clone();
        caches.open("v1").then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
      .catch(e => console.log(e))
  );
});

