/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA
precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell-style routing, so that all navigation requests
// are fulfilled with your index.html shell. Learn more at
// https://developers.google.com/web/fundamentals/architecture/app-shell
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
    // Return false to exempt requests from being fulfilled by index.html.
    ({ request, url }) => {
        // If this isn't a navigation, skip.
        if (request.mode !== 'navigate') {
            return false;
        } // If this is a URL that starts with /_, skip.

        if (url.pathname.startsWith('/_')) {
            return false;
        } // If this looks like a URL for a resource, because it contains // a file extension, skip.

        if (url.pathname.match(fileExtensionRegexp)) {
            return false;
        } // Return true to signal that we want to use the handler.

        return true;
    },
    createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// An example runtime caching route for requests that aren't handled by the
// precache, in this case same-origin .png requests like those from in public/
registerRoute(
    // Add in any other file extensions or routing criteria as needed.
    ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'), // Customize this strategy as needed, e.g., by changing to CacheFirst.
    new StaleWhileRevalidate({
        cacheName: 'images',
        plugins: [
            // Ensure that once this runtime cache reaches a maximum size the
            // least-recently used images are removed.
            new ExpirationPlugin({ maxEntries: 50 }),
        ],
    })
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Any other custom service worker logic can go here.
self.addEventListener('push', ev => {
    const data = ev.data.json();
    self.registration.showNotification('New cases near you', {
        body: `New Locations today: \n${data.join('\n')}`,
        actions: [
            {
                action: 'view',
                title: 'View more',
            }
        ],
        icon: 'https://cdn.pixabay.com/photo/2020/04/29/07/54/coronavirus-5107715_960_720.png',
        vibrate: [100, 100, 100],
        data: { url: self.location.origin }
    });
});

self.addEventListener('notificationclick', event => {
    const appURL = new URL(self.location.origin).href;

    event.notification.close();

    event.waitUntil(
        clients
            .matchAll({
                type: 'window',
                includeUncontrolled: true
            })
            .then((windowClients) => {
                let matchingClient = null;

                for (let i = 0; i < windowClients.length; i++) {
                    const windowClient = windowClients[i];
                    if (windowClient.url === appURL) {
                        matchingClient = windowClient;
                        break;
                    }
                }
                if (matchingClient) {
                    return matchingClient.focus();
                } else {
                    return clients.openWindow(appURL);
                }
            })
    );
});

self.addEventListener('pushsubscriptionchange', function (event) {
    event.waitUntil(
        fetch('https://api.nswcases.com/subscribe/resub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
                newSub: {
                    newEndpoint: event.newSubscription ? event.newSubscription.endpoint : null,
                    newP256dh: event.newSubscription ? event.newSubscription.toJSON().keys.p256dh : null,
                    newAuth: event.newSubscription ? event.newSubscription.toJSON().keys.auth : null
                }
            })
        })
    );
});