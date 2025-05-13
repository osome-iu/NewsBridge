// Import platform configuration
const configUrl = chrome.runtime.getURL('js/platformConfig.js');
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

// Global state
let uid, apiKey, newsbridgedataSharing;
let currentPlatform;

// Initialize platform configuration
import(configUrl)
    .then(module => {
        const { PLATFORM, platformConfig } = module;
        currentPlatform = platformConfig[PLATFORM];
        startProcess();
    })
    .catch(err => {
        console.log("Error in getting the platform configurations.")
    });

// Update token counts and state
function updateTokenCounts() {
    chrome.storage.local.get([currentPlatform.storageKey, 'uid', 'newsbridge-data-sharing'], (data) => {
        apiKey = data[currentPlatform.storageKey];
        uid = data.uid;
        newsbridgedataSharing = data['newsbridge-data-sharing'] !== false;
    });
}

setInterval(updateTokenCounts, 500);

// Main process starter
function startProcess() {
    beginProcess();
    showNewsBridgeIcon();
}

// Show NewsBridge icon in UI
function showNewsBridgeIcon() {
    const intervalId = setInterval(() => {
        const referenceButtonContainer = document.querySelector('[aria-label="New message"]');
        if (!referenceButtonContainer) return;

        clearInterval(intervalId);

        const newsBridgeBtn = document.createElement('button');
        newsBridgeBtn.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 20%;
            margin-right: 10px;
            margin-bottom: 10px;
            background-color: white;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const newsBridgeImg = document.createElement('img');
        newsBridgeImg.src = chrome.runtime.getURL("images/news_bridge.png");
        newsBridgeImg.alt = 'NewsBridge Image';
        newsBridgeImg.style.cssText = `width: 28px; height: 28px;`;

        newsBridgeBtn.appendChild(newsBridgeImg);
        referenceButtonContainer.parentNode.insertBefore(newsBridgeBtn, referenceButtonContainer);

        newsBridgeBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "open_popup" });
        });
    }, 10);
}

// Begin processing posts
function beginProcess() {
    let isProcessing = false;
    let isProcessingQueue = false;
    let postQueue = [];

    async function processNextPost() {
        const timelinePostElements = document.querySelectorAll('.xqcrz7y.x78zum5.x1qx5ct2.x1y1aw1k.x1sxyh0.xwib8y2.xurb0ha.xw4jnvo:not(.processed)');

        for (let post of timelinePostElements) {
            if (!post.hasAttribute('post-id')) {
                post.setAttribute('post-id', crypto.randomUUID());
            }
            postQueue.push(post);
        }

        if (postQueue.length > 0 && !isProcessingQueue) {
            isProcessingQueue = true;
            while (postQueue.length > 0) {
                const post = postQueue.shift();
                await checkPostContent(post);
            }
            isProcessingQueue = false;
        }
    }

    window.addEventListener('scroll', () => {
        if (!isProcessing) {
            isProcessing = true;
            setTimeout(async () => {
                await processNextPost();
                isProcessing = false;
            }, 100);
        }
    });
}

// Check post content for URLs
async function checkPostContent(postElement) {
    showSpinner(postElement);
    const parentSibling = postElement.parentElement.parentElement.nextElementSibling;
    if (!parentSibling) {
        postElement.classList.add('processed');
        return;
    }

    // Get all plain text elements and embedded URL elements
    const plainTextElements = parentSibling.querySelectorAll(".xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd");
    const embeddedUrlElement = parentSibling.querySelector(".xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6");

    let content = "";
    let allATags = [];

    // Process each plain text element
    for (const plainTextElement of plainTextElements) {
        // Skip if this is actually an embedded URL element
        if (plainTextElement.classList.contains("x1n2onr6")) {
            continue;
        }
        // Get content from the first plain text element that has content
        if (!content) {
            content = await extractContent(plainTextElement);
        }

        // Get all anchor tags from this element
        const aTags = plainTextElement.querySelectorAll("a");
        allATags = [...allATags, ...aTags];
    }

    // Process embedded URL element if it exists
    if (embeddedUrlElement) {
        // This is implemented because of the grabbing the chrome html tags won't work the way how the edge browser is working
        if (isChrome) {
            const embeddedElementTextContent = await extractContent(embeddedUrlElement)
            const domainPattern = /(?:https?:\/\/)?[\w.-]+\.[\w.-]+(?:\/[^\s"'<>]*)?/gi;
            const embeddedUrls = embeddedElementTextContent.match(domainPattern) || [];
            if(embeddedUrls.length){
                await showReviewBtn(postElement, content, postElement.getAttribute('post-id'));
            }
        }else{
            const aTagsEmbedded = embeddedUrlElement.querySelectorAll("a");
            allATags = [...allATags, ...aTagsEmbedded];

            // Get content from embedded element if we haven't found any yet
            if (!content) {
                content = await extractContent(embeddedUrlElement);
            }
        }
    }

    let foundValidUrl = false;

    // Process each a tag to find a valid URL
    for (const aTag of allATags) {
        try {
            const href = aTag.getAttribute("href");
            if (!href) continue;

            let cleanUrl;

            // Case 1: Facebook encoded URL (?u=)
            if (href.includes('?u=') || href.includes('&u=')) {
                const urlParams = new URLSearchParams(href.split(/[?&]/)[1]);
                const encodedUrl = urlParams.get('u');
                if (!encodedUrl) continue;

                cleanUrl = new URL(decodeURIComponent(encodedUrl));
            }
            // Case 2: Direct URL with tracking parameters
            else {
                try {
                    cleanUrl = new URL(href);

                    // Skip Facebook URLs
                    if (cleanUrl.hostname.includes('facebook.com') ||
                        cleanUrl.hostname.includes('fb.com')) {
                        continue;
                    }
                } catch {
                    continue;
                }
            }

            // Remove common tracking parameters
            const paramsToRemove = [
                'fbclid', 'h', '__tn__', 'utm_source',
                'utm_medium', 'utm_campaign', 'xt', 'attributionsrc'
            ];

            paramsToRemove.forEach(param => {
                cleanUrl.searchParams.delete(param);
            });

            if (embeddedUrlElement) {
                content += embeddedUrlElement.innerText;
            }
            await showReviewBtn(postElement, content, postElement.getAttribute('post-id'));
            foundValidUrl = true;
            break;
        } catch (error) {
            continue;
        }
    }
    // Mark as processed even if no URLs were found
    postElement.classList.add('processed');
}




// Extract content from post
async function extractContent(htmlElement) {
    let content = htmlElement.innerText;

    if (content.includes("See more")) {
        const seeMoreLink = htmlElement.querySelector(".x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f");
        if (seeMoreLink) {
            seeMoreLink.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            content = htmlElement.innerText;
        }
    }
    return content;
}

// Show loading spinner
function showSpinner(postElement) {
    const elements = postElement.parentElement.parentElement.querySelectorAll('.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1iyjqo2');
    if (elements.length === 0) return;

    if (!document.getElementById('spinnerStyle')) {
        const style = document.createElement('style');
        style.id = 'spinnerStyle';
        style.textContent = `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .spinner {
                width: 20px; height: 20px; border: 3px solid #DDF4EA;
                border-radius: 50%; border-top-color: #056E41;
                animation: spin 0.9s linear infinite;
                position: relative; float: right;
                margin-top: -30px; margin-left: 5px; margin-right: 5px;
            }
        `;
        document.head.appendChild(style);
    }

    elements.forEach(element => {
        if (!element.querySelector('.spinner, .responseButton, .nodata')) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            element.appendChild(spinner);
            setTimeout(() => spinner.remove(), 1500);
        }
    });
}

// Show review button
async function showReviewBtn(postElement, content, postId) {
    const container = postElement.parentElement.querySelector('.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1iyjqo2');
    if (!container || container.querySelector('.responseButton')) return;

    container.querySelector('.spinner')?.remove();

    const button = document.createElement('button');
    button.className = 'responseButton';
    button.style.cssText = `
        background-color: #DDF4EA; color: black; border: 2px solid #009933;
        font-weight: bold; border-radius: 10px; font-size: 12px; padding: 5px;
        cursor: pointer; position: relative; float: right; margin: -31px 0 0 5px;
    `;

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL("images/news_bridge.png");
    img.alt = 'NewsBridge Image';
    img.style.cssText = 'width: 10px; height: 10px; margin: 0 4px 0 0';

    button.appendChild(img);
    button.appendChild(document.createTextNode("Review"));
    button.addEventListener('click', () => showResponseModal(content, postId));

    container.appendChild(button);
}

// Show response modal
async function showResponseModal(content, postId) {
    const {modalContainer } = createModal();

    if (!apiKey) {
        showAPIKeyError(modalContainer);
        return;
    }

    const loading = createLoadingMessage(modalContainer, 'Reviewing article');

    try {
        const response = await callGenerativeAPI({
            content: content,
            generateComment: false,
            postId: postId
        });

        loading.remove();

        if (!response.isSuccess) {
            showError(modalContainer, "NewsBridge Error!", response.errorMsg);
            return;
        }

        const contextCard = createContextCard(response.dataReceived);
        modalContainer.appendChild(contextCard);

        const commentBtn = createGenerateCommentButton(
            content,
            response.dataReceived.contentHTML,
            modalContainer,
            postId
        );
        contextCard.appendChild(commentBtn);
    } catch (error) {
        loading.remove();
        showError(modalContainer, "NewsBridge Error!", error.message);
    }
}

// Create modal dialog
function createModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); display: flex;
        align-items: center; justify-content: center; border-radius: 4px;
    `;

    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = `
        background-color: #fefefe; padding: 20px; border: 1px solid #888;
        width: 40%; text-align: center; display: flex; border-radius: 4px;
        flex-direction: column; position: relative;
    `;

    const closeButton = document.createElement('span');
    closeButton.textContent = '✖';
    closeButton.style.cssText = `
        cursor: pointer; position: absolute; top: 10px; right: 10px;
        font-size: 20px; border: none; font-weight: bold; color: black;
        margin-bottom: 2px;
    `;
    closeButton.addEventListener('click', () => modal.remove());

    modalContainer.appendChild(closeButton);
    modal.appendChild(modalContainer);
    document.body.appendChild(modal);

    return { modal, modalContainer };
}

// Show error message
function showAPIKeyError(container) {
    const errorMsg = document.createElement('p');
    errorMsg.innerHTML = `Please provide your ${currentPlatform.name} API key in NewsBridge 
                         <a href="#" id="settings-link" style="color: blue;text-decoration: underline;">
                         settings page</a>.`;
    errorMsg.style.cssText = `
        margin-top: 10px; text-align: left; color: black; font-size: 12px;
    `;

    // First, append the error message to the DOM (inside showError)
    showError(
        container,
        `NewsBridge Error: No ${currentPlatform.name} API key provided!`,
        errorMsg
    );

    // Now find the link in the DOM and attach the event listener
    const settingsLink = container.querySelector('#settings-link');
    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: "open_settings" });
        });
    } else {
        console.error("Could not find #settings-link!");
    }
}

// Show error message
function showError(container, title, message) {
    const errorCard = document.createElement('div');
    errorCard.style.cssText = `
        background-color: white; border: 1px solid #ddd; border-radius: 4px;
        padding: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        max-width: 100%; margin-top: 12px; word-wrap: break-word;
        overflow-wrap: break-word;
    `;

    const header = document.createElement('h3');
    header.textContent = title;
    header.style.cssText = `
        text-align: left; color: black; font-weight: bold;
        font-size: 16px; margin: 0;
    `;

    errorCard.appendChild(header);

    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = 'margin-top: 5px; text-align: left; color: black; font-size: 12px;';

    if (typeof message === 'string') {
        // Convert URLs to clickable links
        messageContainer.innerHTML = message.replace(
            /(https?:\/\/[^\s]+)/g,
            url => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: blue; text-decoration: underline;">${url}</a>`
        );
    } else {
        // If it's already an HTML element, append it directly
        messageContainer.appendChild(message);
    }

    errorCard.appendChild(messageContainer);
    container.appendChild(errorCard);
}

// Create loading message
function createLoadingMessage(container, message) {
    const loader = document.createElement('div');
    loader.style.cssText = 'text-align: left; white-space: nowrap;';

    let dots = '';
    const interval = setInterval(() => {
        dots = dots.length < 3 ? dots + '.' : '';
        loader.textContent = `${message}${dots}`;
    }, 500);

    loader.interval = interval;
    container.appendChild(loader);

    // Add cleanup method
    loader.remove = () => {
        clearInterval(interval);
        loader.parentNode?.removeChild(loader);
    };

    return loader;
}

// Create context card
function createContextCard(contextData) {
    const card = document.createElement('div');
    card.style.cssText = `
        background-color: white; border: 1px solid #ddd; border-radius: 4px;
        padding: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        max-width: 100%; margin-top: 12px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Context from NewsBridge';
    title.style.cssText = `
        text-align: left; color: black; font-weight: bold;
        font-size: 16px; margin: 0;
    `;

    const content = document.createElement('p');
    content.innerHTML = contextData.contentHTML;
    content.style.cssText = `
        margin-top: 5px; text-align: left; color: black; font-size: 12px;
    `;

    const sources = createSourcesHeader(contextData.webLinks);
    const note = document.createElement('h4');
    note.textContent = 'Note: NewsBridge uses AI to generate content and can make mistakes.';
    note.style.cssText = `
        text-align: left; color: black; font-weight: bold;
        font-size: 12px; margin-bottom: 10px;
    `;

    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(sources);
    card.appendChild(note);

    return card;
}

// Create sources header
function createSourcesHeader(webLinks) {
    const header = document.createElement('p');
    header.style.cssText = `
        margin-top: 2px; text-align: left; color: black;
        font-size: 12px; display: flex;
    `;

    const label = document.createElement('span');
    label.textContent = 'Sources: ';
    label.style.cssText = 'text-align: left; display: flex; font-weight: bold; margin-right: 4px;';

    header.appendChild(label);
    header.appendChild(document.createTextNode(' '));

    if (webLinks.length > 0) {
        const sourceList = document.createElement('span');
        webLinks.forEach((link, index) => {
            sourceList.appendChild(document.createTextNode(`[${index + 1}] `));

            const linkElement = document.createElement('a');
            linkElement.textContent = link.title || 'No title';
            linkElement.href = link.uri;
            linkElement.target = '_blank';
            linkElement.style.cssText = 'color: #0000EE; text-decoration: underline;';

            sourceList.appendChild(linkElement);
            if (index < webLinks.length - 1) {
                sourceList.appendChild(document.createTextNode(', '));
            }
        });
        header.appendChild(sourceList);
    } else {
        const cautionImg = document.createElement('img');
        cautionImg.src = chrome.runtime.getURL("images/caution.gif");
        cautionImg.alt = 'Caution Image';
        cautionImg.style.cssText = `
            width: 15px; height: 15px; vertical-align: middle;
            margin: 0 5px; cursor: pointer; margin-bottom: 3px;
        `;

        const message = document.createElement('span');
        message.textContent = 'The LLM did not provide any sources for this context.';
        message.style.cssText = 'color: black; font-size: 12px;';
        message.prepend(cautionImg);
        header.appendChild(message);
    }

    return header;
}

// Create generate comment button
function createGenerateCommentButton(content, contextHTML, container, postId) {
    const button = document.createElement('button');
    button.style.cssText = `
        background-color: #DDF4EA; border: 2px solid #009933; color: black;
        border-radius: 10px; font-size: 0.8rem; padding: 0.5em 1.5em;
        cursor: pointer; width: 100%; max-width: 300px; display: flex;
        align-items: center; justify-content: center; text-align: center;
    `;

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL("images/news_bridge.png");
    img.alt = 'NewsBridge Image';
    img.style.cssText = 'width: 16px; height: 16px; border-radius: 50%; margin-right: 5px;';

    button.appendChild(img);
    button.appendChild(document.createTextNode('Generate a Bridging Comment'));

    button.addEventListener('click', async () => {
        const loading = createLoadingMessage(container, 'Generating comment');

        // Remove the existing comment section
        const existingCard = container.querySelector('#commentCard');

        if (existingCard) {
            existingCard.remove();
        }

        try {
            const response = await callGenerativeAPI({
                content: content,
                context: contextHTML,
                generateComment: true,
                postId: postId
            });

            loading.remove();

            if (!response.isSuccess) {
                showError(container, "NewsBridge Error!", response.errorMsg);
                return;
            }

            // Remove the existing comment section
            const existingCard = container.querySelector('#commentCard');

            if (existingCard) {
                existingCard.remove();
            }
            createCommentCard(container, response.dataReceived);
        } catch (error) {
            loading.remove();
            showError(container, "NewsBridge Error!", error.message);
        }
    });
    return button;
}


// Create comment card
function createCommentCard(container, comment) {
    const card = document.createElement('div');
    card.id = 'commentCard';
    card.style.cssText = `
        background-color: white; border: 1px solid #ddd; border-radius: 4px;
        padding: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        max-width: 100%; margin-top: 5px;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Comment';
    title.style.cssText = `
        text-align: left; color: black; font-weight: bold; font-size: 16px;
    `;

    const content = document.createElement('p');
    content.textContent = comment;
    content.style.cssText = 'text-align: left; color: black; font-size: 12px;';

    const copyButton = createCopyButton(comment);

    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(copyButton);
    container.appendChild(card);

    return card;
}

// Create copy button
function createCopyButton(text) {
    const button = document.createElement('button');
    button.style.cssText = `
        background-color: #DDF4EA; border: 2px solid #009933; color: black;
        border-radius: 10px; font-size: 0.8rem; padding: 0.5em 1.5em;
        cursor: pointer; width: 100%; max-width: 300px; display: flex;
        align-items: center; justify-content: center; text-align: center;
    `;

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL("images/copy_to_clipboard.png");
    img.alt = 'Clipboard Icon';
    img.style.cssText = 'width: 12px; height: 15px; margin-right: 6px;';

    button.appendChild(img);
    button.appendChild(document.createTextNode("Copy to Clipboard"));

    button.addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
            const message = document.createElement('div');
            message.textContent = 'Copied to Clipboard!';
            message.style.cssText = 'margin-top: 5px; color: green; text-align: left;';
            button.parentNode.insertBefore(message, button.nextSibling);
            setTimeout(() => message.remove(), 1000);
        }).catch(console.error);
    });

    return button;
}


const generateContextPrompt = "You are an assistant designed to find reliable contextual information about news headlines. " +
    "Your goal is to provide a summary, background context, and credible sources that help the user better understand the topic. " +
    "Always prioritize reputable sources, such as established news outlets and academic publications, " +
    "while avoiding biased or unverified content. Present the summary concisely, USING NO MORE THAN FOUR SENTENCES. " +
    "Please respond in paragraph form without formatting, like bullets."

const generateCommentPrompt = "Generate a very short, friendly, casual response to the following POST that highlights key points and aligns with the CONTEXT. " +
    "Write in the style of an average, polite social media user without being condescending, confrontational, or pedantic. " +
    "You want to help the original poster to better understand the context.  The goal is to create a comment that bridges the POST and the CONTEXT.  Do not use emojis"

// Call generative AI API
async function callGenerativeAPI(options) {
    const { content, context, generateComment, postId } = options;

    if (!apiKey) {
        return {
            isSuccess: false,
            errorMsg: `No ${currentPlatform.name} API key provided!`
        };
    }

    try {
        let apiUrl, requestBody, headers;

        if (currentPlatform.name === 'Google') {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${apiKey}`;
            requestBody = {
                contents: [{
                    parts: [{
                        text: generateComment
                            ? `POST: ${content}\nCONTEXT: ${context}`
                            : content
                    }]
                }],
                systemInstruction: {
                    parts: [{
                        text: generateComment
                            ? generateCommentPrompt
                            : generateContextPrompt
                    }]
                },
                tools: {
                    google_search_retrieval: {
                        dynamic_retrieval_config: { mode: 'MODE_DYNAMIC' }
                    }
                }
            };
            headers = {
                'Content-Type': 'application/json'
            };
        } else { // OpenAI
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            requestBody = {
                model: generateComment ? "gpt-4.1" : "gpt-4o-search-preview",
                ...(!generateComment && { web_search_options: {} }),
                messages: [{
                    role: "system",
                    content: generateComment
                        ? generateCommentPrompt
                        : generateContextPrompt
                }, {
                    role: "user",
                    content: generateComment ? `POST: ${content}\nCONTEXT: ${context}` : content
                }]
            };
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        updateTokenUsage(data);

        if (newsbridgedataSharing) {
            if(generateComment){
                logUsage(postId, content, currentPlatform.name, "", data, true)
            }else{
                logUsage(postId, content, currentPlatform.name, data,"", false)
            }
        }

        return {
            isSuccess: true,
            dataReceived: generateComment
                ? extractGeneratedText(data)
                : buildResponseContent(data)
        };
    } catch (error) {
        console.error("API Error:", error);
        return {
            isSuccess: false,
            errorMsg: error.message
        };
    }
}

// Extract generated text from API response
function extractGeneratedText(data) {
    if (currentPlatform.name === 'Google') {
        // Handle Google response format
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (currentPlatform.name === 'OpenAI') {
        // Handle OpenAI response format - return just the raw content without citations
        return data.choices?.[0]?.message?.content || '';
    } else {
        // Fallback for other platforms
        return data.choices?.[0]?.message?.content || '';
    }
}

// Build response content with sources
function buildResponseContent(data) {
    if (currentPlatform.name === 'Google') {
        // Handle Google response format
        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text || '';
        const supports = candidate?.groundingMetadata?.groundingSupports || [];
        const chunks = candidate?.groundingMetadata?.groundingChunks || [];

        const webLinks = [];
        const modifiedContent = [];
        let currentIndex = 0;

        for (const support of supports) {
            const { startIndex = 0, endIndex } = support.segment;

            if (currentIndex < startIndex) {
                modifiedContent.push(content.slice(currentIndex, startIndex));
            }

            const segmentText = content.slice(startIndex, endIndex);
            modifiedContent.push(segmentText);

            const references = support.groundingChunkIndices
                ?.map(idx => chunks[idx]?.web)
                ?.filter(Boolean)
                ?.map(web => {
                    const existing = webLinks.findIndex(l => l.uri === web.uri);
                    if (existing === -1) {
                        webLinks.push({ title: web.title || 'No title', uri: web.uri });
                        return webLinks.length;
                    }
                    return existing + 1;
                })
                ?.filter(Boolean)
                ?.sort((a, b) => a - b);

            if (references?.length) {
                const refLinks = references.map(idx => {
                    const uri = webLinks[idx - 1].uri;
                    return `<a href="${uri}" target="_blank" style="color: #0000ee;">${idx}</a>`;
                }).join(', ');

                if (content[endIndex - 1] === '.') {
                    modifiedContent.pop();
                    modifiedContent.push(segmentText.slice(0, -1));
                    modifiedContent.push(` [${refLinks}].`);
                } else {
                    modifiedContent.push(` [${refLinks}]`);
                }
            }
            currentIndex = endIndex;
        }
        if (currentIndex < content.length) {
            modifiedContent.push(content.slice(currentIndex));
        }
        return {
            contentHTML: modifiedContent.join(""),
            webLinks
        };
    }if (currentPlatform.name === 'OpenAI') {
        const message = data.choices?.[0]?.message;
        let content = message?.content || '';
        const annotations = message?.annotations || [];
        const webLinks = [];
        const modifiedContent = [];
        let currentIndex = 0;

        // Sort annotations by start position (ascending)
        const sortedAnnotations = [...annotations].sort((a, b) => {
            const aStart = a.url_citation?.start_index || a.segment?.startIndex || 0;
            const bStart = b.url_citation?.start_index || b.segment?.startIndex || 0;
            return aStart - bStart;
        });

        for (const annotation of sortedAnnotations) {
            const startIndex = annotation.url_citation?.start_index || annotation.segment?.startIndex || 0;
            const endIndex = annotation.url_citation?.end_index || annotation.segment?.endIndex || 0;

            if (currentIndex < startIndex) {
                modifiedContent.push(content.slice(currentIndex, startIndex));
            }

            currentIndex = endIndex;

            let references = [];
            if (annotation.url_citation) {
                const url = annotation.url_citation.url;
                const domain = new URL(url).hostname.replace(/^www\./, '');
                const existing = webLinks.findIndex(l => l.uri === url);
                if (existing === -1) {
                    webLinks.push({
                        title: domain,
                        uri: url
                    });
                    references.push(webLinks.length);
                } else {
                    references.push(existing + 1);
                }
            } else if (annotation.references) {
                references = annotation.references
                    ?.map(ref => ref.web)
                    ?.filter(Boolean)
                    ?.map(web => {
                        const domain = new URL(web.uri).hostname.replace(/^www\./, '');
                        const existing = webLinks.findIndex(l => l.uri === web.uri);
                        if (existing === -1) {
                            webLinks.push({ title: domain, uri: web.uri });
                            return webLinks.length;
                        }
                        return existing + 1;
                    })
                    ?.filter(Boolean);
            }

            if (references.length) {
                let punctuation = '';
                let newIndex = endIndex;

                // Check for punctuation (period, comma, etc.)
                if (content[endIndex]?.match(/[.,;!?]/)) {
                    punctuation = content[endIndex];
                    newIndex = endIndex + 1;
                }

                // Create clickable citation links to appear after punctuation
                const refLinks = references.map(idx => {
                    const uri = webLinks[idx - 1].uri;
                    return `<a href="${uri}" target="_blank" style="color: blue;">${idx}</a>`;
                }).join(',');

                // Format as [1,2] after the punctuation mark
                modifiedContent.push(punctuation + `[${refLinks}]`);
                currentIndex = newIndex;
            }
        }

        if (currentIndex < content.length) {
            modifiedContent.push(content.slice(currentIndex));
        }

        return {
            contentHTML: modifiedContent.join(""),
            webLinks
        };
    }
}


// Update token usage in storage
function updateTokenUsage(data) {
    chrome.storage.local.get([currentPlatform.usageKey], (result) => {
        let tokenUsage = result[currentPlatform.usageKey] || {
            promptTokenCount: 0,
            completionTokenCount: 0,
            totalTokenCount: 0
        };

        if (currentPlatform.name === 'Google') {
            tokenUsage.promptTokenCount += data.usageMetadata?.promptTokenCount || 0;
            tokenUsage.completionTokenCount += data.usageMetadata?.candidatesTokenCount || 0;
        } else {
            tokenUsage.promptTokenCount += data.usage?.prompt_tokens || 0;
            tokenUsage.completionTokenCount += data.usage?.completion_tokens || 0;
        }

        tokenUsage.totalTokenCount = tokenUsage.promptTokenCount + tokenUsage.completionTokenCount;
        chrome.storage.local.set({ [currentPlatform.usageKey]: tokenUsage });
    });
}


// logUsage(postId, content, currentPlatform.name, "", data, true)
// Log usage to backend
async function logUsage(postId, newsHeadline, aiPlatform, apiResponse, generatedComment, isComment) {
    try {
        await fetch('https://osome.iu.edu/tools/newsbridge/api/update-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: uid,
                recordedAt: new Date().toISOString(),
                postId: postId,
                newsHeadline: newsHeadline,
                aiPlatform: aiPlatform,
                apiResponse: JSON.stringify(apiResponse),
                generatedComment: JSON.stringify(generatedComment),
                isComment: isComment
            })
        });
    } catch (error) {
        console.error("Usage logging failed:", error);
    }
}