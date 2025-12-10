import { fetchAITemplates } from './directus';

const DEEPSEEK_API_URL = process.env.REACT_APP_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY;
const API_BASE_URL = process.env.REACT_APP_API_URL;

// Функция для выполнения запросов к DeepSeek API
// Использует прокси через Directus в продакшене, прямой запрос в разработке
const makeDeepSeekRequest = async (requestBody) => {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(requestBody)
    };

    if (API_BASE_URL) {
        const proxyUrl = `${API_BASE_URL}/deepseek-proxy`;
        
        try {
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    targetUrl: DEEPSEEK_API_URL,
                    method: 'POST',
                    headers: options.headers,
                    body: options.body
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Proxy request failed: ${response.statusText} - ${errorText}`);
            }

            return response;
        } catch (error) {
            console.error('Proxy request error:', error);
            throw new Error(`Не удалось выполнить запрос через прокси. Проверьте, что эндпоинт /deepseek-proxy настроен на сервере. Ошибка: ${error.message}`);
        }
    }
    
    // В разработке используем прямой запрос (работает через setupProxy.js)
    return fetch(DEEPSEEK_API_URL, options);
};

export const improveJobDescriptions = async (jobDescriptions, departmentId) => {
    try {
        const templates = await fetchAITemplates(departmentId);
        console.log('Шаблоны для отдела:', templates);

        let messages = [
            {
                role: "system",
                content: "Ты - профессиональный специалист по информационным технологиям и информационной безопасности. Твоя задача - улучшить описания работ, сделав их более структурированными и детальными, сохраняя при этом исходный смысл и технический контекст."
            }
        ];

        if (templates && templates.length > 0) {
            // Преобразуем шаблоны в нужный формат
            const formattedTemplates = templates.map(template => {
                return template.JobDescription.map(job => ({
                    jobName: job.jobName,
                    resourceDay: job.resourceDay || 0,
                    frameDay: job.frameDay || 0
                }));
            }).flat();

            messages.push({
                role: "user",
                content: `Используй следующие примеры как референс для стиля и уровня детализации:\n${JSON.stringify(formattedTemplates, null, 2)}\n\nУлучши описание следующих работ, сделай их более детальными и профессиональными. Сохрани структуру данных, числовые значения и маркеры списка:\n${JSON.stringify(jobDescriptions, null, 2)}\nВ ответе верни только JSON без дополнительного форматирования.`
            });
        } else {
            console.log('Шаблоны не найдены, используем базовый промпт');
            messages.push({
                role: "user",
                content: `Улучши описание следующих работ, сделай их более детальными и профессиональными. Добавь структуру с маркерами списка (•) там, где это уместно. Сохрани структуру данных и числовые значения:\n${JSON.stringify(jobDescriptions, null, 2)}\nВ ответе верни только JSON без дополнительного форматирования.`
            });
        }

        const response = await makeDeepSeekRequest({
            model: 'deepseek-chat',
            messages: messages,
            stream: false
        });

        if (!response.ok) {
            throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanContent = content.replace(/```json\n|\n```/g, '');
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw error;
    }
};

export const sendMessageToDeepSeek = async (messages, model = 'deepseek-chat') => {
    try {
        const response = await makeDeepSeekRequest({
            model: model,
            messages: messages,
            stream: false
        });

        if (!response.ok) {
            throw new Error('Failed to get DeepSeek response');
        }

        const data = await response.json();
        return {
            role: 'assistant',
            content: data.choices[0].message.content
        };
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw error;
    }
}; 