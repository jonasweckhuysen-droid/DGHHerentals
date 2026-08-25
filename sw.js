const CACHE_NAME = "magazijn-cache-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  // Nieuwe versie niet laten wachten op de oude service worker
  self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys().then((keys) => {

      return Promise.all(

        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))

      );

    })

  );

  // Nieuwe service worker neemt onmiddellijk controle over
  // de reeds geopende/geïnstalleerde app
  self.clients.claim();

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", (event) => {

  const request = event.request;
  const url = new URL(request.url);

  /*
     Alleen requests naar onze eigen website
     behandelen met de service worker.
     
     Firebase, Google, QR-scanner, CDN's enz.
     blijven rechtstreeks naar het internet gaan.
  */

  const isAppShell =
    url.origin === self.location.origin;

  if (!isAppShell) {
    return;
  }


  /*
     We behandelen alleen GET requests.
  */

  if (request.method !== "GET") {
    return;
  }


  /* =======================================================
     HTML / APP-PAGINA
     
     NETWERK EERST
     
     Hierdoor krijgt de gebruiker bij het openen van
     de geïnstalleerde app altijd de nieuwste index.html.
     
     Alleen wanneer er geen internet is, gebruiken we
     de gecachte versie.
     ======================================================= */

  const isHtmlRequest =
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");


  if (isHtmlRequest) {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

        .then((response) => {

          /*
             Nieuwe index.html onmiddellijk in de cache
             plaatsen zodat ze ook offline beschikbaar is.
          */

          if (
            response &&
            response.status === 200
          ) {

            const responseClone =
              response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });

          }

          return response;

        })

        .catch(() => {

          /*
             Geen internet?
             Dan gebruiken we de laatst bekende versie.
          */

          return caches.match(request)
            .then((cached) => {

              if (cached) {
                return cached;
              }

              return caches.match("./index.html");

            });

        })

    );

    return;
  }


  /* =======================================================
     APP-SHELL BESTANDEN
     
     Voor afbeeldingen, manifest enz.
     gebruiken we cache-first.
     ======================================================= */

  const isAppShellFile =
    APP_SHELL.some((file) => {

      const fileUrl =
        new URL(file, self.location.href);

      return fileUrl.pathname === url.pathname;

    });


  if (isAppShellFile) {

    event.respondWith(

      caches.match(request)
        .then((cached) => {

          if (cached) {
            return cached;
          }

          return fetch(request)
            .then((response) => {

              if (
                response &&
                response.status === 200
              ) {

                const responseClone =
                  response.clone();

                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(
                      request,
                      responseClone
                    );
                  });

              }

              return response;

            });

        })

    );

    return;
  }


  /* =======================================================
     ANDERE EIGEN BESTANDEN
     
     Bijvoorbeeld CSS, JavaScript enz.
     
     Eerst netwerk zodat updates onmiddellijk zichtbaar zijn.
     Bij offline gebruik wordt de cache gebruikt.
     ======================================================= */

  event.respondWith(

    fetch(request, {
      cache: "no-store"
    })

      .then((response) => {

        if (
          response &&
          response.status === 200
        ) {

          const responseClone =
            response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {

              cache.put(
                request,
                responseClone
              );

            });

        }

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

  );

});


/* =========================================================
   BERICHTEN VAN DE APP
   ========================================================= */

self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
