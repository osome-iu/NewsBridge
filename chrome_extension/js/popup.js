import { PLATFORM, platformConfig } from './platformConfig.js';

// DOM Elements
const newsBridgeImgElement = document.getElementById('newsBridgeImage');
const apiKeyStored = document.getElementById('apiKeyStored');
const apiKeyNotStored = document.getElementById('apiKeyNotStored');
const shareDataCheckbox = document.getElementById('shareData');
const settingsLink = document.getElementById('settings-link');

// Initialize platform UI
function initPlatformUI() {
    const platform = platformConfig[PLATFORM];

    // Update platform name references
    document.querySelectorAll('.ai-platform-name').forEach(el => {
        el.textContent = platform.name;
    });

    // Update platform link
    const aiPlatformLink = document.getElementById('aiPlatformLink');
    aiPlatformLink.href = platform.helpLink;
    document.getElementById('aiPlatformName').textContent = platform.name;
}

// Update storage status with immediate sync
function updateStorageStatus() {
    chrome.storage.local.get([platformConfig[PLATFORM].storageKey, 'newsbridge-data-sharing'], (data) => {
        // API Key status
        const apiKey = data[platformConfig[PLATFORM].storageKey];
        apiKeyStored.style.display = apiKey ? 'block' : 'none';
        apiKeyNotStored.style.display = apiKey ? 'none' : 'block';

        // Data sharing - initialize to true if not set
        if (data['newsbridge-data-sharing'] === undefined) {
            chrome.storage.local.set({ 'newsbridge-data-sharing': true });
            shareDataCheckbox.checked = true;
        } else {
            shareDataCheckbox.checked = data['newsbridge-data-sharing'];
        }
    });
}

// Open options page
function openOptionsPage() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    newsBridgeImgElement.src = chrome.runtime.getURL('images/news_bridge.png');
    initPlatformUI();

    // Initialize with immediate update
    updateStorageStatus();

    settingsLink.addEventListener('click', openOptionsPage);
});

document.getElementById('shareData').addEventListener('change', function () {
    const shareDataCheckbox = this.checked;
    chrome.storage.local.set({ 'newsbridge-data-sharing': shareDataCheckbox });
});

// Faster storage status updates (every 1 second)
setInterval(updateStorageStatus, 1000);