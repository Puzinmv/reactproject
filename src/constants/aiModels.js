export const AI_MODELS = [
    // Google Models
    {
        id: 'google/gemini-2.0-flash-thinking-exp:free',
        name: 'Gemini 2.0 Thinking',
        description: 'Экспериментальная модель с улучшенными способностями к рассуждению. Показывает ход своих мыслей.',
        context: '40K токенов',
        provider: 'Google'
    },
    {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash',
        description: 'Быстрая модель с высоким качеством ответов. Хорошо работает с кодом и сложными инструкциями.',
        context: '1M токенов',
        provider: 'Google'
    },
    {
        id: 'google/gemini-2.0-pro-exp-02-05:free',
        name: 'Gemini 2.0 Pro',
        description: 'Профессиональная версия Gemini с расширенными возможностями.',
        context: '128K токенов',
        provider: 'Google'
    },
    {
        id: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        name: 'Gemini 2.0 Flash Lite',
        description: 'Облегченная версия Gemini Flash для быстрых ответов.',
        context: '32K токенов',
        provider: 'Google'
    },
    {
        id: 'google/gemini-exp-1206',
        name: 'Gemini Experimental',
        description: 'Экспериментальная версия Gemini с новыми возможностями.',
        context: '128K токенов',
        provider: 'Google'
    },
    {
        id: 'google/learnlm-1.5-pro-experimental:free',
        name: 'LearnLM 1.5 Pro',
        description: 'Экспериментальная версия LearnLM для обучения и анализа.',
        context: '41K токенов',
        provider: 'Google'
    },

    // Meta Models
    {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Llama 3.3 70B',
        description: 'Мощная многоязычная модель. Поддерживает 8 языков. Отлично подходит для диалогов.',
        context: '131K токенов',
        provider: 'Meta'
    },
    {
        id: 'meta-llama/llama-3.2-1b-instruct:free',
        name: 'Llama 3.2 1B',
        description: 'Легкая версия Llama для базовых задач. Быстрые ответы.',
        context: '131K токенов',
        provider: 'Meta'
    },

    // Deepseek Models
    {
        id: 'deepseek/deepseek-r1-zero:free',
        name: 'Deepseek R1 Zero',
        description: 'Базовая модель Deepseek для общих задач.',
        context: '32K токенов',
        provider: 'Deepseek'
    },
    {
        id: 'deepseek/deepseek-r1:free',
        name: 'Deepseek R1',
        description: 'Улучшенная версия с расширенными возможностями.',
        context: '64K токенов',
        provider: 'Deepseek'
    },
    {
        id: 'deepseek/deepseek-chat:free',
        name: 'Deepseek Chat',
        description: 'Специализированная модель для диалогов.',
        context: '32K токенов',
        provider: 'Deepseek'
    },
    {
        id: 'deepseek/deepseek-r1-distill-llama-70b:free',
        name: 'Deepseek R1 Distill 70B',
        description: 'Дистиллированная версия на базе Llama 70B.',
        context: '128K токенов',
        provider: 'Deepseek'
    },

    // Qwen Models
    {
        id: 'qwen/qwq-32b:free',
        name: 'Qwen 32B',
        description: 'Универсальная модель для различных задач.',
        context: '128K токенов',
        provider: 'Qwen'
    },
    {
        id: 'qwen/qwen2.5-vl-72b-instruct:free',
        name: 'Qwen 2.5 VL 72B',
        description: 'Мощная модель с поддержкой визуального анализа.',
        context: '128K токенов',
        provider: 'Qwen'
    },
    {
        id: 'qwen/qwen-2.5-coder-32b-instruct:free',
        name: 'Qwen 2.5 Coder',
        description: 'Специализированная модель для программирования и математики.',
        context: '128K токенов',
        provider: 'Qwen'
    },

    // Other Models
    {
        id: 'moonshotai/moonlight-16b-a3b-instruct:free',
        name: 'Moonlight 16B',
        description: 'Модель для инструкций и диалогов.',
        context: '32K токенов',
        provider: 'Moonshot AI'
    },
    {
        id: 'nousresearch/deephermes-3-llama-3-8b-preview:free',
        name: 'DeepHermes 3',
        description: 'Предварительная версия модели на базе Llama 3.',
        context: '32K токенов',
        provider: 'Nous Research'
    },
    {
        id: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
        name: 'Dolphin 3.0 R1',
        description: 'Модель на базе Mistral с улучшенным пониманием контекста.',
        context: '32K токенов',
        provider: 'Cognitive Computations'
    },
    {
        id: 'cognitivecomputations/dolphin3.0-mistral-24b:free',
        name: 'Dolphin 3.0',
        description: 'Базовая версия Dolphin на Mistral.',
        context: '32K токенов',
        provider: 'Cognitive Computations'
    },
    {
        id: 'mistralai/mistral-small-24b-instruct-2501:free',
        name: 'Mistral Small 24B',
        description: 'Компактная версия Mistral для инструкций.',
        context: '32K токенов',
        provider: 'Mistral AI'
    },
    {
        id: 'sophosympatheia/rogue-rose-103b-v0.2:free',
        name: 'Rogue Rose 103B',
        description: 'Большая модель с широкими возможностями.',
        context: '128K токенов',
        provider: 'Sophos Sympatheia'
    },
    {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
        name: 'Nemotron 70B',
        description: 'Модель от NVIDIA на базе Llama для точных и полезных ответов.',
        context: '131K токенов',
        provider: 'NVIDIA'
    }
];

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-thinking-exp:free';
export default DEFAULT_MODEL;