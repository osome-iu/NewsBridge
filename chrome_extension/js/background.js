
// This for having a unique id per install
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['uid'], (result) => {
        if (!result.uid) {
            const uid = `${crypto.randomUUID().split('-')[0]}${Date.now().toString(36)}`;
            chrome.storage.local.set({ uid: uid });
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'open_popup') {
        chrome.action.openPopup();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'open_settings') {
        // Use chrome.tabs.create to open the settings.html page in a new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }
});
