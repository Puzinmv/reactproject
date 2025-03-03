import { fetchAITemplates } from './directus';

const DEEPSEEK_API_URL = process.env.REACT_APP_DEEPSEEK_API_URL;
const DEEPSEEK_API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY;

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

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                stream: false
            })
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