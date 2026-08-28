const CACHE_NAME = "magazijn-cache-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];


/* =========================================================
   FIREBASE CLOUD MESSAGING
   =========================================================

   Firebase wordt ook in de service worker geladen zodat
   pushmeldingen kunnen worden ontvangen wanneer de app
   niet geopend is.
   ========================================================= */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

firebase.initializeApp({
  apiKey: "AIzaSyBHao9v3GvW-IONs-R2TVDt-vGxMc4fxKE",
  authDomain: "dghmagazijn-d38bf.firebaseapp.com",
  projectId: "dghmagazijn-d38bf",
  storageBucket: "dghmagazijn-d38bf.firebasestorage.app",
  messagingSenderId: "725175536466",
  appId: "1:725175536466:web:6da1c46b81b5dcb0e8888b"
});


/* =========================================================
   FIREBASE MESSAGING
   ========================================================= */

const messaging = firebase.messaging();


/* =========================================================
   PUSHMELDINGEN OP DE ACHTERGROND
   =========================================================

   Dit wordt uitgevoerd wanneer de app niet actief/open is
   en Firebase een pushmelding ontvangt.
   ========================================================= */

messaging.onBackgroundMessage((payload) => {

  console.log(
    "[Magazijn] Achtergrondmelding ontvangen:",
    payload
  );


  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    "Magazijn Ziekenwagen";


  const notificationOptions = {

    body:
      payload.notification?.body ||
      payload.data?.body ||
      "Er is een wijziging in het magazijn.",

    icon:
      payload.notification?.icon ||
      "./icon-192.png",

    badge:
      "./icon-192.png",

    data: {
      url:
        payload.data?.url ||
        "./"
    },

    tag:
      payload.data?.tag ||
      "magazijn-melding",

    renotify: true

  };


  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );

});


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME).then((cache) => {

      return cache.addAll(APP_SHELL);

    })

  );


  /*
     Nieuwe service worker onmiddellijk activeren.
  */

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


  /*
     Nieuwe service worker neemt onmiddellijk controle
     over reeds geopende/geïnstalleerde apps.
  */

  self.clients.claim();

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", (event) => {

  const request = event.request;
  const url = new URL(request.url);


  /*
     Alleen requests naar onze eigen website behandelen.
     
     Firebase, Google, Firebase Messaging, QR-scanner,
     QR-generator en andere CDN's gaan rechtstreeks
     naar het internet.
  */

  const isAppShell =
    url.origin === self.location.origin;


  if (!isAppShell) {
    return;
  }


  /*
     Alleen GET requests behandelen.
  */

  if (request.method !== "GET") {
    return;
  }


  /* =======================================================
     HTML / APP-PAGINA
     
     NETWERK EERST
     
     Hierdoor krijgt de gebruiker bij het openen van de
     geïnstalleerde app altijd de nieuwste index.html.
     
     Alleen wanneer er geen internet is gebruiken we
     de laatst opgeslagen versie.
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
             Alleen geldige antwoorden cachen.
          */

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

          /*
             Geen internet?

             Dan gebruiken we de laatst bekende
             versie van de applicatie.
          */

          return caches.match(request)
            .then((cached) => {

              if (cached) {
                return cached;
              }


              return caches.match(
                "./index.html"
              );

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
        new URL(
          file,
          self.location.href
        );


      return (
        fileUrl.pathname ===
        url.pathname
      );

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
     
     Eerst netwerk zodat updates onmiddellijk zichtbaar
     zijn.
     
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
   KLIKKEN OP EEN PUSHMELDING
   ========================================================= */

self.addEventListener(
  "notificationclick",
  (event) => {

    event.notification.close();


    const targetUrl =
      event.notification?.data?.url ||
      "./";


    event.waitUntil(

      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })

        .then((clientList) => {

          /*
             Als de magazijn-app al open staat,
             gebruiken we dat venster.
          */

          for (const client of clientList) {

            if (
              "focus" in client
            ) {

              return client.focus();

            }

          }


          /*
             Anders openen we de app.
          */

          if (
            clients.openWindow
          ) {

            return clients.openWindow(
              targetUrl
            );

          }

        })

    );

  }
);


/* =========================================================
   BERICHTEN VAN DE APP
   ========================================================= */

self.addEventListener(
  "message",
  (event) => {

    if (
      event.data &&
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }

  }
);
