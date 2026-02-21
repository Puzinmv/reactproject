# Аудит структуры проекта и предложения по улучшению

## Что есть сейчас

Текущая структура уже разделяет код по базовым слоям (`pages`, `Components`, `services`, `hooks`, `context`, `styles`), что хорошо для старта.

Проблемы, которые видно по дереву:

1. **Смешение уровней абстракции в `src/Components`**
   - В одной папке лежат и UI-элементы (например, `ModalForm`), и более «бизнесовые» блоки (`TableJobOnTrip`, `TemplatePanel`).
2. **Несогласованный нейминг**
   - Папка `Components` в PascalCase, остальные папки в lower-case.
   - В `services` есть файл `1c.js`, который отличается по стилю именования и ухудшает переносимость.
3. **Несколько app-entry файлов на одном уровне**
   - `App.js`, `AnalyticsApp.js`, `GradeApp.js` лежат рядом, но не очевидно, где главный вход и как выбирать приложение.
4. **Тесты только в общей папке `src/__tests__`**
   - Это усложняет поддержку при росте: тесты оторваны от модулей.
5. **Пустой/неинформативный README**
   - Нет документации по структуре, запуску и соглашениям.

## Рекомендуемая целевая структура

```text
src/
  app/
    index.js                # bootstrap / providers / routing
    routes.js
  pages/
    ai-chat/
      index.jsx
      components/
    anketa-kii/
      index.jsx
      components/
  features/
    auth/
      components/
      hooks/
      services/
      index.js
    tables/
      components/
      hooks/
      index.js
  shared/
    ui/
      modal/
      table/
      app-bar/
    hooks/
    lib/
    constants/
    styles/
  services/
    api/
      directus.js
      openproject.js
      openrouter.js
      oneC.js
      deepseek.js
  context/
  tests/
```

## Предлагаемый план миграции (без «большого взрыва»)

### Этап 1: стандартизировать имена и документацию

- Переименовать `src/Components` → `src/components`.
- Переименовать `src/services/1c.js` → `src/services/oneC.js`.
- Добавить/обновить README с описанием структуры и правил нейминга.

### Этап 2: улучшить модульность

- Выделить «фичи» (`auth`, `chat`, `tables`) и переместить туда бизнес-компоненты.
- Оставить в `shared/ui` только переиспользуемые «чистые» компоненты.

### Этап 3: упростить точки входа

- Создать единый `src/app/index.js` и явную маршрутизацию.
- `AnalyticsApp` и `GradeApp` оформить как страницы/разделы, а не отдельные root-level app-файлы.

### Этап 4: подтянуть тестирование

- Постепенно переносить тесты ближе к модулям (`Component.test.js` рядом с компонентом) или в `tests/unit` / `tests/integration`.
- Добавить smoke-тесты для ключевых страниц и сервисов.

## Быстрые улучшения с высокой отдачей

1. Ввести алиасы импортов (`@/shared`, `@/features`, `@/pages`) через `jsconfig.json`.
2. Ввести barrel-экспорты (`index.js`) на уровне модулей.
3. Ограничить прямой импорт между фичами через ESLint-правила (dependency boundaries).
4. Убрать дубли зависимостей в `dependencies/devDependencies` (например, testing-library пакеты).

## Definition of Done для рефакторинга структуры

- Любой новый компонент попадает в один из слоев: `pages` / `features` / `shared`.
- Нейминг файлов и папок единообразный (camelCase/PascalCase по договоренности, без исключений вроде `1c.js`).
- Есть короткий architecture-раздел в README.
- CI прогоняет сборку и тесты после каждого шага миграции.
