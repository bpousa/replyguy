// popup.js
// This script runs in the extension popup.

document.getElementById('generateReply').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "generateReply"});
  });
});