// Background script to handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to toggle widget
  chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
});
