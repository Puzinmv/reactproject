// Сервис для работы с OpenRouter API

const API_URL = process.env.REACT_APP_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const SITE_URL = window.location.origin;
const SITE_NAME = 'AI Chat';

export const sendMessageToAI = async (messages, model) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'AI Chat App'
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка API: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message;
    } catch (error) {
        console.error('Ошибка при обращении к OpenRouter:', error);
        throw error;
    }
};

export const getAvailableModels = async () => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': SITE_URL,
                'X-Title': SITE_NAME
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка получения моделей: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Ошибка при получении доступных моделей:', error);
        return []; // Возвращаем пустой массив в случае ошибки
    }
}; 