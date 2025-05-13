// Select from openai and google
export const PLATFORM = 'openai';

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