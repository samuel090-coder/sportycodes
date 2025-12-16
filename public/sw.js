// Service Worker for Push Notifications - Rich Notification Support

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'SPORTY CODES',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'SPORTY CODES';
  
  // Build rich notification options
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'sporty-codes-notification',
    requireInteraction: false,
    renotify: true,
    vibrate: [200, 100, 200],
    data: data.data || data,
    // Rich notification actions
    actions: [
      { action: 'open', title: '👀 View' },
      { action: 'dismiss', title: '✖️ Dismiss' }
    ]
  };

  // Add image for rich notifications (Android big picture style)
  if (data.image) {
    options.image = data.image;
  }
  
  // Check nested data for image
  if (data.data && data.data.image) {
    options.image = data.data.image;
  }

  console.log('[Service Worker] Showing notification:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received:', event.action);
  
  event.notification.close();
  
  // Handle different actions
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default action or 'open' action - open the app
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});
