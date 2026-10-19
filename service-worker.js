
self.addEventListener("push", function (event) {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "MIT Assignment Reminder";

  const options = {
    body: data.body || "You have an assignment due tomorrow!",
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow(
      event.notification.data.url || "./"
    )
  );
});
