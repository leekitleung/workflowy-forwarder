chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'notification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: request.title || 'WorkFlowy Reminder',
      message: request.message
    });
  }
}); 