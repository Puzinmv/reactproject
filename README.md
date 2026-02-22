# React Project

Краткая документация по проекту.

## Запуск

```bash
npm install
npm start
```

## Проверки

```bash
npm test -- --watchAll=false
npm run build
```

## Текущая структура

- `src/pages` — страницы приложения.
- `src/Components` — UI и бизнес-компоненты (исторически смешано).
- `src/services` — интеграции с внешними API.
- `src/hooks` — кастомные React hooks.
- `src/context` — React context.
- `src/styles` — тема и глобальные стили.

## Предложения по улучшению структуры

Подробный аудит и пошаговый план рефакторинга в файле:

- `docs/PROJECT_STRUCTURE_RECOMMENDATIONS.md`
