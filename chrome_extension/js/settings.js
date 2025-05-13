import { PLATFORM, platformConfig, validateGoogleAPIKey, validateOpenAIAPIKey } from './platformConfig.js';

const currentPlatform = platformConfig[PLATFORM];
let loadingInterval;

// DOM elements
const promptTokenCount = document.getElementById('promptTokenCount');
const candidateTokenCount = document.getElementById('candidateTokenCount');
const totalTokenCount = document.getElementById('totalTokenCount');
const extensionId = document.getElementById('extensionId');
const copyExtensionBtnId = document.getElementById('copyExtensionBtnId');
const copiedText = document.getElementById('copiedText');
const submitButton = document.getElementById('submitAPIKeyBtn');
const apiResponse = document.getElementById('api-response');
const apiKeyInput = document.getElementById('apiKeyInput');
const shareDataCheckbox = document.getElementById('shareData');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updatePlatformUI();
    loadAPIKey();
    loadExtensionId();
    updateTokenCounts();
    loadDataSharingSetting();

    // Set up event listeners
    submitButton.addEventListener('click', handleAPIKeySubmit);
    copyExtensionBtnId.addEventListener('click', copyExtensionId);
    shareDataCheckbox.addEventListener('change', saveDataSharingSetting);
});

function updatePlatformUI() {
    document.getElementById('platformName').textContent = currentPlatform.name;
    document.getElementById('platformNameLower').textContent = currentPlatform.nameLower;
    document.getElementById('platformNameLabel').textContent = currentPlatform.name;
    apiKeyInput.placeholder = `Enter ${currentPlatform.name} API key`;
}

function loadAPIKey() {
    chrome.storage.local.get([currentPlatform.storageKey], function(data) {
        const apiKey = data[currentPlatform.storageKey];
        if (apiKey) {
            apiResponse.innerText = `A ${currentPlatform.name} API key is already stored.`;
            apiResponse.style.color = '#056E41';
            submitButton.innerText = "Replace";
        } else {
            apiResponse.innerText = '';
            submitButton.innerText = "Save";
        }
    });
}

async function handleAPIKeySubmit() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showApiResponse('Please enter a valid API key.', 'red');
        return;
    }

    resetTokenresetTokenCountsCounts()
    submitButton.disabled = true;
    showLoadingMessage(`Validating ${currentPlatform.name} API key`);

    try {
        let isValid;
        // Use the appropriate validation function based on platform
        if (PLATFORM === 'google') {
            isValid = await validateGoogleAPIKey(apiKey);
        } else if (PLATFORM === 'openai') {
            isValid = await validateOpenAIAPIKey(apiKey);
        }

        if (isValid) {
            await chrome.storage.local.set({
                [currentPlatform.storageKey]: apiKey,
                // Reset token counts when new key is saved
                [currentPlatform.usageKey]: {
                    promptTokenCount: 0,
                    completionTokenCount: 0,
                    totalTokenCount: 0
                }
            });

            showApiResponse(`Your ${currentPlatform.name} API key has been saved successfully!`, '#0A6A47');
            submitButton.innerText = 'Replace';
            updateTokenCounts();

            apiKeyInput.value = '';
        } else {
            await chrome.storage.local.set({
                [currentPlatform.storageKey]: "",
                // Reset token counts when new key is saved
                [currentPlatform.usageKey]: {
                    promptTokenCount: 0,
                    completionTokenCount: 0,
                    totalTokenCount: 0
                }
            });
            showApiResponse('API key is invalid. Please check and try again.', '#FF0000');
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        showApiResponse('Error validating API key. Please try again.', '#FF0000');
    } finally {
        submitButton.disabled = false;
        clearLoadingMessage();
    }
}

function showLoadingMessage(message) {
    apiResponse.innerText = message;
    apiResponse.style.color = '#056E41';

    let dotCount = 0;
    loadingInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        apiResponse.innerText = `${message}${'.'.repeat(dotCount)}`;
    }, 500);
}

function clearLoadingMessage() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }
}

function showApiResponse(message, color) {
    apiResponse.innerText = message;
    apiResponse.style.color = color;
}

function loadExtensionId() {
    chrome.storage.local.get(['uid'], function(data) {
        if (data.uid) {
            extensionId.textContent = data.uid;
        }
    });
}

function copyExtensionId() {
    const extensionIdText = extensionId.textContent;
    navigator.clipboard.writeText(extensionIdText)
        .then(() => {
            copiedText.innerText = "Copied!";
            copiedText.style.color = 'green';
            setTimeout(() => copiedText.innerText = "", 100);
        })
        .catch(err => {
            console.error("Failed to copy text: ", err);
        });
}

function updateTokenCounts() {
    chrome.storage.local.get([currentPlatform.usageKey], function(data) {
        const tokenUsage = data[currentPlatform.usageKey] || {
            promptTokenCount: 0,
            completionTokenCount: 0,
            totalTokenCount: 0
        };

        promptTokenCount.textContent = tokenUsage.promptTokenCount || 0;
        candidateTokenCount.textContent = tokenUsage.completionTokenCount || 0;
        totalTokenCount.textContent = tokenUsage.totalTokenCount || 0;
    });
}

function resetTokenresetTokenCountsCounts() {
    const initialTokenUsage = {
        promptTokenCount: 0,
        completionTokenCount: 0,
        totalTokenCount: 0
    };
    chrome.storage.local.set({ [currentPlatform.usageKey]: initialTokenUsage });
    updateTokenCounts();
}

function loadDataSharingSetting() {
    chrome.storage.local.get(['newsbridge-data-sharing'], function(data) {
        shareDataCheckbox.checked = data['newsbridge-data-sharing'] !== false;
    });
}

function saveDataSharingSetting() {
    chrome.storage.local.set({ 'newsbridge-data-sharing': shareDataCheckbox.checked });
}

// Update token counts every 10 seconds
setInterval(updateTokenCounts, 100);