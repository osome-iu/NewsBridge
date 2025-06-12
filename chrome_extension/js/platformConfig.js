// Select from openai and google
export const PLATFORM = 'openai';
export const SOCIALMEDIA = 'facebook';

export const platformConfig = {
    google: {
        name: 'Google',
        nameLower: 'google',
        storageKey: 'google-api-key',
        usageKey: 'google-api-key-session-usage',
        placeholder: 'Enter Google API key',
        helpLink: 'https://ai.google.dev/pricing#1_5pro'
    },
    openai: {
        name: 'OpenAI',
        nameLower: 'openai',
        storageKey: 'openai-api-key',
        usageKey: 'openai-api-key-session-usage',
        placeholder: 'Enter OpenAI API key',
        helpLink: 'https://platform.openai.com/docs/api-reference'
    }
};

export const socialMediaQuerySelection = {
    facebook: {
        // Get the timeline post elements from the feed.
        timelinePostElements: '.xqcrz7y.x78zum5.x1qx5ct2.x1y1aw1k.xf159sx.xwib8y2.xmzvs34.xw4jnvo:not(.processed)',
        reviewBtnElement: '.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1iyjqo2.xeuugli',
        plainTextElements: '.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl',
        embeddedUrlElement: '.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6',
        seeMoreElement: '.x1i10hfl.xjbqb8w.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.xkrqix3.x1sur9pj.xzsf02u.x1s688f'
    }
}


export async function validateGoogleAPIKey(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello, Google Gemini! Validate API Key.' }] }]
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error validating Google API key:', error);
        return false;
    }
}

export async function validateOpenAIAPIKey(apiKey) {
    const url = 'https://api.openai.com/v1/models';

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Error validating OpenAI API key:', error);
        return false;
    }
}


